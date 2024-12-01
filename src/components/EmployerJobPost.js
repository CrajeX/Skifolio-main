import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

const EmployerJobPost = () => {
    const [user] = useAuthState(auth);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [averageScore, setAverageScore] = useState(50); // Default average score to 50
    const [companyName, setCompanyName] = useState('');

    // Fetch the company name when the component mounts
    useEffect(() => {
        const fetchCompanyName = async () => {
            try {
                if (user) {
                    const employerDoc = await getDoc(doc(db, 'employers', user.uid));
                    if (employerDoc.exists()) {
                        setCompanyName(employerDoc.data().companyName);
                    }
                }
            } catch (error) {
                console.error('Error fetching company name:', error);
            }
        };
        fetchCompanyName();
    }, [user]);

    const handleAverageScoreChange = (e) => {
        const value = parseInt(e.target.value, 10) || 0;
        setAverageScore(Math.max(0, Math.min(100, value))); // Clamp between 0 and 100
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const jobId = `job_${Date.now()}`;
            const jobRef = doc(db, 'jobs-to-be-approved', jobId);

            await setDoc(jobRef, {
                id: jobId,
                title,
                description,
                location,
                averageScore,
                createdAt: new Date(),
                employerId: user?.uid,
                companyName,
                status: 'pending',
            });

            // Clear form after submission
            setTitle('');
            setDescription('');
            setLocation('');
            setAverageScore(50);
            alert('Job posted successfully and is awaiting approval!');
        } catch (error) {
            console.error('Error posting job:', error);
            alert('Failed to post the job. Please try again.');
        }
    };

    return (
        <div id="job-posting-container" style={{ padding: '20px', maxWidth: '600px', margin: 'auto',marginTop:"90px" }}>
            <h2>Post a Job</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Job Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
                />
                <textarea
                    placeholder="Job Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
                />
                <input
                    type="text"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
                />

                {/* Average Score Input */}
                <div style={{ marginBottom: '20px' }}>
                    <label>Average Score:</label>
                    <input
                        type="number"
                        value={averageScore}
                        min="0"
                        max="100"
                        onChange={handleAverageScoreChange}
                        placeholder="0-100"
                        style={{ marginLeft: '10px', width: '90px' }}
                    />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={averageScore}
                        onChange={(e) => setAverageScore(parseInt(e.target.value, 10))}
                        style={{ marginLeft: '10px', width: '80%' }}
                    />
                    <span style={{ marginLeft: '10px' }}>{averageScore}%</span>
                </div>

                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}>
                    Submit Job
                </button>
            </form>

            {/* Explanation Section */}
            <div style={{ marginTop: '20px', padding: '10px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ color: '#d9534f', fontWeight: 'bold', fontSize: '20px', marginRight: '10px' }}>!</span>
                    <strong>How the System Evaluates the Average Score:</strong>
                </div>
                <ul style={{ fontSize: '0.9em', lineHeight: '1.6' }}>
                    <li>
                        <strong>HTML:</strong> Evaluates structure, accessibility, and avoidance of deprecated tags like <code>&lt;font&gt;</code>.
                    </li>
                    <li>
                        <strong>CSS:</strong> Ensures modularity, minimal use of <code>!important</code>, and adherence to coding standards.
                    </li>
                    <li>
                        <strong>JavaScript:</strong> Checks for clean code, modularity, and avoidance of debugging artifacts like <code>console.log</code>.
                    </li>
                </ul>
                <p style={{ marginTop: '10px', color: '#555', fontSize: '0.9em' }}>
                    The average score reflects the quality standard for applicants' portfolios.
                </p>
            </div>
        </div>
    );
};

export default EmployerJobPost;
