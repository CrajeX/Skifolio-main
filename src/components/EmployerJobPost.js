import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

const EmployerJobPost = () => {
    const [user] = useAuthState(auth); // Get current user from auth state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [averageScore, setAverageScore] = useState(0); // Single average score input
    const [companyName, setCompanyName] = useState('');

    // Fetch the company name when the component mounts
    useEffect(() => {
        const fetchCompanyName = async () => {
            if (user) {
                const employerDoc = await getDoc(doc(db, 'employers', user.uid));
                if (employerDoc.exists()) {
                    setCompanyName(employerDoc.data().companyName);
                }
            }
        };
        fetchCompanyName();
    }, [user]);

    const handleAverageScoreChange = (e) => {
        setAverageScore(parseInt(e.target.value, 10) || 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const jobId = `#job_${Date.now()}`;
            const jobRef = doc(db, 'jobs', jobId); // Use the jobId as the document name
            
            await setDoc(jobRef, {
                id: jobId,
                title,
                description,
                location,
                averageScore, // Store the single average score
                createdAt: new Date(),
                employerId: user.uid, // Store employer's UID
                companyName: companyName, // Store employer's company name
            });

            // Clear fields after submission
            setTitle('');
            setDescription('');
            setLocation('');
            setAverageScore(0); // Reset the average score
            alert('Job posted successfully!');
        } catch (error) {
            console.error('Error posting job:', error);
        }
    };

    return (
        <div id="job-posting-container">
            <h2>Post a Job</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Job Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <textarea
                    placeholder="Job Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                />

                {/* Average Score Input */}
                <div>
                    <label>Average Score:</label>
                    <input
                        type="number"
                        value={averageScore}
                        min="0"
                        max="100"
                        onChange={handleAverageScoreChange}
                    />
                    <span>%</span>
                </div>

                <button type="submit">Post Job</button>
            </form>
        </div>
    );
};

export default EmployerJobPost;
