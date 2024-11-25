import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

const JobSearch = () => {
    const [jobs, setJobs] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [expandedJob, setExpandedJob] = useState(null);
    const [userAverage, setUserAverage] = useState(null);

    useEffect(() => {
        const fetchUserAverageScore = async () => {
            if (auth.currentUser) {
                const userRef = doc(db, "applicants", auth.currentUser.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    setUserAverage(parseFloat(userData.skills?.average || 0));
                }
            }
        };

        const fetchJobs = async () => {
            const jobsCollection = collection(db, "jobs");
            const jobSnapshot = await getDocs(jobsCollection);

            const jobList = jobSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                averageScore: parseFloat(doc.data().averageScore || 0),
            }));

            setJobs(jobList);
            setFilteredJobs(jobList);
        };

        fetchUserAverageScore();
        fetchJobs();
    }, []);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        const filtered = jobs.filter((job) =>
            job.title.toLowerCase().includes(e.target.value.toLowerCase()) ||
            job.description.toLowerCase().includes(e.target.value.toLowerCase())
        );
        setFilteredJobs(filtered);
    };

    const highestEligibleJobs = filteredJobs.filter((job) => {
        const jobAvgScore = job.averageScore;
        const userAvgScore = userAverage;
        return userAvgScore !== null && userAvgScore >= jobAvgScore;
    });

            const handleApply = async (jobId, e) => {
                e.stopPropagation();
                if (auth.currentUser) {
                    try {
                        const userId = auth.currentUser.uid;
                        const userRef = doc(db, 'applicants', userId);
                        const userSnap = await getDoc(userRef);

                        if (!userSnap.exists()) {
                            console.error("User data not found!");
                            return;
                        }

                        const userData = userSnap.data();
                        const { name, resumeURL, certifications = [], githubLink, email } = userData;

                        // Fetch user submissions
                        const submissionsRef = collection(db, 'applicants', userId, 'submissions');
                        const submissionSnapshot = await getDocs(submissionsRef);

                        const submissions = submissionSnapshot.docs.map((doc) => ({
                            id: doc.id, // The unique submission ID
                            demoVideoLink: doc.data().demoVideoLink || "",
                            liveDemoLink: doc.data().liveDemoLink || "",
                            scores: doc.data().scores || { css: 0, html: 0, javascript: 0 },
                            timestamp: doc.data().timestamp || null,
                        }));

                        // Save application data
                        const applicationRef = doc(db, 'jobs', jobId, 'applications', userId);
                        const applicationData = {
                            userId,
                            jobId,
                            appliedAt: Timestamp.now(),
                            name, // User's name
                            resumeURL, // Resume link
                            certifications, // User's certificates
                            githubLink, // GitHub profile link
                            email, // User's email
                            submissions, // Submissions fetched
                        };

                        await setDoc(applicationRef, applicationData);
                        console.log(`Applied to job with ID: ${jobId} successfully.`);
                    } catch (error) {
                        console.error("Error applying to job:", error);
                    }
                } else {
                    console.log("No user logged in");
                }
            };

    return (
        <div style={{ position: "relative" }}>
            <div
                id="job-search-container"
                style={{
                    padding: "20px",
                    filter: expandedJob ? "blur(4px)" : "none", // Blur background only
                    transition: "filter 0.3s ease-in-out",
                }}
            >
                <h2>Search Jobs</h2>
                <input
                    type="text"
                    placeholder="Search for jobs..."
                    value={searchTerm}
                    onChange={handleSearch}
                    style={{
                        marginBottom: "20px",
                        width: "100%",
                        padding: "10px",
                        borderRadius: "5px",
                        border: "1px solid #ddd",
                    }}
                />

                <div>
                    <h3>Highest Eligible Jobs</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                        {highestEligibleJobs.map((job) => (
                            <div
                                key={job.id}
                                style={{
                                    border: "1px solid #ddd",
                                    borderRadius: "8px",
                                    padding: "10px",
                                    width: "200px",
                                    cursor: "pointer",
                                    background: "#fff",
                                }}
                                onClick={() => setExpandedJob(job)}
                            >
                                <h4>{job.title}</h4>
                                <p><strong>Company:</strong> {job.companyName}</p>
                                <p><strong>Location:</strong> {job.location}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3>All Jobs</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                        {filteredJobs.map((job) => (
                            <div
                                key={job.id}
                                style={{
                                    border: "1px solid #ddd",
                                    borderRadius: "8px",
                                    padding: "10px",
                                    width: "200px",
                                    cursor: "pointer",
                                    background: "#fff",
                                }}
                                onClick={() => setExpandedJob(job)}
                            >
                                <h4>{job.title}</h4>
                                <p><strong>Company:</strong> {job.companyName}</p>
                                <p><strong>Location:</strong> {job.location}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {expandedJob && (
                <div
                    style={{
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        backgroundColor: "#fff",
                        borderRadius: "10px",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                        width: "80%",
                        maxHeight: "80%",
                        padding: "20px",
                        zIndex: 1000,
                        overflowY: "auto", // Scroll for overflow
                    }}
                >
                    <h3>{expandedJob.title}</h3>
                    <p><strong>Company:</strong> {expandedJob.companyName}</p>
                    <p>{expandedJob.description}</p>
                    <button
                        onClick={(e) => handleApply(expandedJob.id, e)}
                        style={{
                            backgroundColor: "#007bff",
                            color: "#fff",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "5px",
                            cursor: "pointer",
                            marginRight: "10px",
                        }}
                    >
                        Apply
                    </button>
                    <button
                        onClick={() => setExpandedJob(null)}
                        style={{
                            backgroundColor: "#ccc",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "5px",
                            cursor: "pointer",
                        }}
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
};

export default JobSearch;
