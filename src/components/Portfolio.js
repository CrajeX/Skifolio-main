import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase'; // Include storage in your Firebase import
import { doc, getDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import axios from 'axios';

const Portfolio = () => {
    const [userData, setUserData] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [liveDemoLink, setLiveDemoLink] = useState('');
    const [demoVideoFile, setDemoVideoFile] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isVideoValid, setIsVideoValid] = useState(false);
    const [submissionLoading, setSubmissionLoading] = useState(false);
    const [userRepos, setUserRepos] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUserData();
        fetchSubmissions();
    }, []);

    const fetchUserData = async () => {
        if (auth.currentUser) {
            const userRef = doc(db, 'applicants', auth.currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                setUserData(userSnap.data());
                fetchUserRepos(userSnap.data().githubLink);
            } else {
                console.log("No such document!");
            }
        }
    };

    const fetchUserRepos = async (githubLink) => {
        const username = githubLink.split('/').pop();
        try {
            const response = await axios.get(`https://api.github.com/users/${username}/repos`);
            setUserRepos(response.data.map(repo => repo.name));
        } catch (error) {
            console.error("Error fetching user repositories:", error);
        }
    };

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const submissionsRef = collection(doc(db, 'applicants', auth.currentUser.uid), 'submissions');
            const snapshot = await getDocs(submissionsRef);
            const submissionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubmissions(submissionsData);
        } catch (error) {
            console.error("Error fetching submissions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('video/')) {
            setDemoVideoFile(file);
            setIsVideoValid(true);
        } else {
            setDemoVideoFile(null);
            setIsVideoValid(false);
            alert('Please upload a valid video file (e.g., .mp4, .mov).');
        }
    };

    const handleOpenModal = () => setShowModal(true);

    const handleCloseModal = () => {
        setShowModal(false);
        setDemoVideoFile(null);
        setIsVideoValid(false);
    };

    const handleSubmission = async () => {
        if (!liveDemoLink.trim() || !demoVideoFile) {
            alert("Please enter a valid live demo link and upload a video.");
            return;
        }

        const repoName = liveDemoLink.split('/').pop();
        if (!userRepos.includes(repoName)) {
            alert("The repository does not belong to the signed-in GitHub account.");
            return;
        }

        setSubmissionLoading(true);

        try {
            // Upload video to Firebase Storage
            const storageRef = ref(storage, `videos/${auth.currentUser.uid}/${demoVideoFile.name}`);
            const uploadTask = await uploadBytes(storageRef, demoVideoFile);
            const videoURL = await getDownloadURL(uploadTask.ref);

            // Analyze live demo link
            const newPayload = { url: liveDemoLink };
            const response = await axios.post('https://casestudy-19cm.onrender.com/analyze', newPayload);

            if (response?.data?.scores) {
                const newSubmission = {
                    liveDemoLink,
                    demoVideoLink: videoURL,
                    timestamp: new Date(),
                    scores: response.data.scores,
                };

                const submissionsRef = collection(doc(db, 'applicants', auth.currentUser.uid), 'submissions');
                await addDoc(submissionsRef, newSubmission);

                fetchSubmissions();
                setLiveDemoLink('');
                handleCloseModal();
            }
        } catch (error) {
            console.error("Error submitting the demo link:", error);
        } finally {
            setSubmissionLoading(false);
        }
    };

    const handleDeleteSubmission = async (submissionId) => {
        if (window.confirm("Are you sure you want to delete this submission?")) {
            try {
                const submissionRef = doc(db, 'applicants', auth.currentUser.uid, 'submissions', submissionId);
                await deleteDoc(submissionRef);
                fetchSubmissions();
            } catch (error) {
                console.error("Error deleting submission:", error);
            }
        }
    };

    return (
        <div style={{ padding: '20px' }} id='portfolio'>
            <h3>Portfolio</h3>
            {userData && (
                <p>
                    GitHub: <a href={userData.githubLink} target="_blank" rel="noopener noreferrer">{userData.githubLink}</a>
                </p>
            )}

            <input
                type="text"
                placeholder="Enter Live Demo Link"
                value={liveDemoLink}
                onChange={(e) => setLiveDemoLink(e.target.value)}
            />
            <button onClick={handleOpenModal}>Submit</button>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h4>Upload Demo Video</h4>
                        <input type="file" accept="video/*" onChange={handleFileChange} />
                        <div className="modal-actions">
                            <button onClick={handleCloseModal}>Cancel</button>
                            <button
                                disabled={!isVideoValid}
                                onClick={handleSubmission}
                            >
                                {submissionLoading ? "Submitting..." : "Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <p>Loading submissions...</p>
            ) : (
                <div className="submissions-container">
                    {submissions.map((submission, index) => (
                        <div key={submission.id} className="submission-card">
                            <h4>
                                <a
                                    href={submission.liveDemoLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="demo-link"
                                >
                                    Live Demo [{index + 1}]
                                </a>
                            </h4>
                            <video width="320" height="240" controls>
                                <source src={submission.demoVideoLink} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                            <p>Scores:</p>
                            <ul>
                                <li>HTML: {submission.scores.html}</li>
                                <li>CSS: {submission.scores.css}</li>
                                <li>JavaScript: {submission.scores.javascript}</li>
                            </ul>
                            <button onClick={() => handleDeleteSubmission(submission.id)}>Delete</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Portfolio;
