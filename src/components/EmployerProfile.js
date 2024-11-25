import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import '../styles.css';
const EmployerProfile = () => {
    const [profilePicURL, setProfilePicURL] = useState('');
    const [coverPhotoURL, setCoverPhotoURL] = useState('');
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('N/A');
    const [jobs, setJobs] = useState([]);
    const [applicants, setApplicants] = useState({});
    const [selectedJob, setSelectedJob] = useState(null);
    const [selectedApplicant, setSelectedApplicant] = useState(null);

    useEffect(() => {
        const loadEmployerData = async () => {
            const userDoc = await getDoc(doc(db, 'employers', auth.currentUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setProfilePicURL(data.profilePicURL || '');
                setCoverPhotoURL(data.coverPhotoURL || '');
                setName(data.name || '');
                setCompanyName(data.companyName || 'N/A');
            }
        };

        const fetchJobs = async () => {
            const jobQuery = query(collection(db, 'jobs'), where('employerId', '==', auth.currentUser.uid));
            const jobSnapshot = await getDocs(jobQuery);
            const jobData = jobSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setJobs(jobData);
        };

        loadEmployerData();
        fetchJobs();
    }, []);

    const fetchApplicants = async (jobId) => {
        const applicationsRef = collection(db, 'jobs', jobId, 'applications');
        const appSnapshot = await getDocs(applicationsRef);
        const applicantsData = appSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setApplicants((prev) => ({ ...prev, [jobId]: applicantsData }));
    };

    const handleJobClick = (job) => {
        setSelectedJob(job.id);
        if (!applicants[job.id]) {
            fetchApplicants(job.id);
        }
    };

    const handleApplicantClick = (applicant) => {
        setSelectedApplicant(applicant);
    };

    const handleCloseApplicantModal = () => {
        setSelectedApplicant(null);
    };

    return (
        <div>
            <h2>Welcome, {companyName}</h2>

            {/* Job Listings */}
            <div style={{ marginTop: '30px' }}>
                <h3>Your Jobs</h3>
                {jobs.length === 0 ? (
                    <p>No jobs posted yet.</p>
                ) : (
                    jobs.map((job) => (
                        <div
                            key={job.id}
                            style={{ border: '1px solid #ccc', padding: '15px', margin: '15px 0' }}
                            onClick={() => handleJobClick(job)}
                        >
                            <h4>{job.title}</h4>
                            <p>{job.description}</p>
                            {selectedJob === job.id && (
                                <div>
                                    <h5>Applicants:</h5>
                                    <div
                                        style={{
                                            maxHeight: '200px', // Limit the height
                                            overflowY: 'auto', // Enable vertical scrolling
                                            border: '1px solid #ccc',
                                            padding: '10px',
                                            borderRadius: '5px',
                                        }}
                                    >
                                        {applicants[job.id] && applicants[job.id].length > 0 ? (
                                            applicants[job.id].map((applicant) => (
                                                <div
                                                    key={applicant.id}
                                                    style={{
                                                        padding: '10px',
                                                        margin: '10px 0',
                                                        backgroundColor: '#f9f9f9',
                                                        cursor: 'pointer',
                                                        borderRadius: '5px',
                                                    }}
                                                    onClick={() => handleApplicantClick(applicant)}
                                                >
                                                    <p><strong>Name:</strong> {applicant.name}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p>No applicants yet.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Applicant Modal */}
            {selectedApplicant && (
                <div className="modal-overlay1">
                    <div
                        className="modal-content1"
                        
                    >
                        <h4>Applicant Details</h4>
                        <p><strong>Name:</strong> {selectedApplicant.name}</p>
                        <p><strong>Email:</strong> {selectedApplicant.email}</p>
                        <p><strong>Resume:</strong>{' '}
                            <a
                                href={selectedApplicant.resumeURL}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {selectedApplicant.resumeURL}
                                {/* View Resume */}
                            </a>
                        </p>
                        <p><strong>Certifications:</strong></p>
                        <div style={{ marginBottom: '20px' }}>
                            {selectedApplicant.certifications && Object.keys(selectedApplicant.certifications).length > 0 ? (
                                Object.entries(selectedApplicant.certifications).map(([skill, certs]) => (
                                    <div key={skill} style={{ marginBottom: '5px' }}>
                                        <strong>{skill}:</strong>
                                        <div>
                                            {certs.map((cert, index) => (
                                                <div key={index}>
                                                    <a href={cert} target="_blank" rel="noopener noreferrer" style={{ color: '#007BFF' }}>
                                                        Certificate {index + 1}
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>No certifications available</p>
                            )}
                        </div>

                        <p><strong>Submissions:</strong></p>
                        {selectedApplicant.submissions && selectedApplicant.submissions.length > 0 ? (
                            selectedApplicant.submissions.map((submission, index) => (
                                <div
                                    key={submission.id}
                                    style={{
                                        marginBottom: '20px',
                                        padding: '10px',
                                        border: '1px solid #ccc',
                                        borderRadius: '5px',
                                    }}
                                >
                                    <div>
                                     <video width="100%" controls style={{ margin: '10px 0' }}>
                                        <source src={submission.demoVideoLink} type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                    </div>
                                    <a
                                        href={submission.liveDemoLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#007BFF', fontWeight: 'bold' }}
                                    >
                                        Live Demo Link: Demo {index + 1}
                                    </a>
                                   
                                    <p>CSS Score: {submission.scores?.css || 'N/A'}</p>
                                    <p>HTML Score: {submission.scores?.html || 'N/A'}</p>
                                    <p>JavaScript Score: {submission.scores?.javascript || 'N/A'}</p>
                                </div>
                            ))
                        ) : (
                            <p>No submissions</p>
                        )}
                        <button onClick={handleCloseApplicantModal} style={{ marginTop: '10px' }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployerProfile;
