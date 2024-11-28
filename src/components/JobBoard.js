import React, { useState } from 'react';
import { db } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';

const JobBoard = () => {
    const [jobTitle, setJobTitle] = useState('');
    const [jobDescription, setJobDescription] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, 'jobs'), {
            jobTitle,
            jobDescription,
        });
        alert('Job posted successfully');
    };

    return (
        <div>
            <h2>Job Board</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Job Title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    required
                />
                <textarea
                    placeholder="Job Description"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required
                />
                <button type="submit">Post Job</button>
            </form>
        </div>
    );
};

export default JobBoard;
