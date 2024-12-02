import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, getDoc, updateDoc, arrayRemove, setDoc, collection, addDoc } from 'firebase/firestore';

const ApplicantProfile = () => {
    const [profilePicURL, setProfilePicURL] = useState('');
    const [coverPhotoURL, setCoverPhotoURL] = useState('');
    const [name, setName] = useState('');
    const [resumeURL, setResumeURL] = useState('');
    const [certifications, setCertifications] = useState({
        HTML: [],
        CSS: [],
        JavaScript: [],
        Others:[],
    });
    const [selectedSkill, setSelectedSkill] = useState('HTML');

    useEffect(() => {
        const loadUserData = async () => {
            if (!auth.currentUser) {
                console.error("User is not signed in.");
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'applicants', auth.currentUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setProfilePicURL(data.profilePicURL || 'defaultProfilePic.jpg');
                    setCoverPhotoURL(data.coverPhotoURL || 'defaultCoverPhoto.jpg');
                    setName(data.name || '');
                    setResumeURL(data.resumeURL || '');
                    setCertifications({
                        HTML: Array.isArray(data.certifications?.HTML) ? data.certifications.HTML : [],
                        CSS: Array.isArray(data.certifications?.CSS) ? data.certifications.CSS : [],
                        JavaScript: Array.isArray(data.certifications?.JavaScript) ? data.certifications.JavaScript : [],
                        Others: Array.isArray(data.certifications?.Others) ? data.certifications.Others : [],
                    });
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        loadUserData();
    }, []);

    const handleFileChange = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
    
        let storageRef;
        let url;
    
        try {
            if (type === 'resume') {
                storageRef = ref(storage, `users/${auth.currentUser.uid}/resume/${file.name}`);
                await uploadBytes(storageRef, file);
                url = await getDownloadURL(storageRef);
                setResumeURL(url);
                await updateDoc(doc(db, 'applicants', auth.currentUser.uid), { resumeURL: url });
            } else if (type === 'certificate') {
                storageRef = ref(storage, `users/${auth.currentUser.uid}/certifications/${selectedSkill}/${file.name}`);
                await uploadBytes(storageRef, file);
                url = await getDownloadURL(storageRef);
                const updatedCertifications = [...(certifications[selectedSkill] || []), url];
                setCertifications((prev) => ({
                    ...prev,
                    [selectedSkill]: updatedCertifications,
                }));
                await updateDoc(doc(db, 'applicants', auth.currentUser.uid), {
                    certifications: {
                        ...certifications,
                        [selectedSkill]: updatedCertifications,
                    },
                });
            } else if (type === 'profilePic') {
                storageRef = ref(storage, `users/${auth.currentUser.uid}/profilePic/${file.name}`);
                await uploadBytes(storageRef, file);
                url = await getDownloadURL(storageRef);
                setProfilePicURL(url);
                await updateDoc(doc(db, 'applicants', auth.currentUser.uid), { profilePicURL: url });
            } else if (type === 'coverPhoto') {
                storageRef = ref(storage, `users/${auth.currentUser.uid}/coverPhoto/${file.name}`);
                await uploadBytes(storageRef, file);
                url = await getDownloadURL(storageRef);
                setCoverPhotoURL(url);
                await updateDoc(doc(db, 'applicants', auth.currentUser.uid), { coverPhotoURL: url });
            }
        } catch (error) {
            console.error("Error uploading file:", error);
        }
    };
    

    const archiveFile = async (type, skill, url) => {
        const archivedData = {
            applicantId: auth.currentUser.uid,
            type,
            skill,
            url,
            deletedAt: new Date(),
        };
        try {
            await addDoc(collection(db, 'deletedFiles'), archivedData);
        } catch (error) {
            console.error("Error archiving file:", error);
        }
    };

    const handleDelete = async (type, skill, url) => {
        try {
            // Archive the file before deletion
            await archiveFile(type, skill, url);

            const storageRef = ref(storage, url);
            await deleteObject(storageRef);

            if (type === 'resume') {
                await updateDoc(doc(db, 'applicants', auth.currentUser.uid), { resumeURL: '' });
                setResumeURL('');
            } else if (type === 'certificate') {
                const updatedCertifications = certifications[skill].filter((cert) => cert !== url);
                setCertifications((prev) => ({
                    ...prev,
                    [skill]: updatedCertifications,
                }));
                await updateDoc(doc(db, 'applicants', auth.currentUser.uid), {
                    certifications: {
                        ...certifications,
                        [skill]: updatedCertifications,
                    },
                });
            }
        } catch (error) {
            console.error("Error deleting file:", error);
        }
    };

    return (
        <div id='applicant'>
            <h2>Applicant Profile</h2>

            {/* Cover Photo */}
            <div style={{ position: 'relative', width: '100%', height: '200px', overflow: 'hidden', marginBottom: '10px' }}>
                <img
                    src={coverPhotoURL}
                    alt="Cover"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => document.getElementById('coverPhotoInput').click()}
                />
                <input
                    id="coverPhotoInput"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e, 'coverPhoto')}
                />
            </div>

            {/* Profile Picture */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '-50px', position: 'relative', }}>
                <img
                    src={profilePicURL}
                    alt="Profile"
                    style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        borderColor:'green',
                        cursor: 'pointer',
                        border: '3px solid blue',
                    }}
                    onClick={() => document.getElementById('profilePicInput').click()}
                />
                <input
                
                    id="profilePicInput"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none'}}
                    onChange={(e) => handleFileChange(e, 'profilePic')}
                />
                <div style={{ marginLeft: '20px' }}>
                    <br></br>
                    <h3>{name}</h3>
                </div>
            </div>
             {/* Badges */}
             <div style={{ marginTop: '20px', display: 'flex', gap: '10px',marginLeft: "10px" }}>
                {Object.keys(certifications).map((skill) =>
                    skill !== "Others" && certifications[skill]?.length > 0 ? ( // Exclude "Others"
                        <span
                            key={skill}
                            style={{
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                padding: '5px 10px',
                                borderRadius: '5px',
                                fontSize: '12px',
                            }}
                        >
                            {skill} Certified
                        </span>
                    ) : null
                )}
            </div>
            {/* Resume */}
            <div style={{ marginTop: '20px' }} id='Resume'>
                <h4>Resume</h4>
                {resumeURL ? (
                    <div>
                        <a href={resumeURL} target="_blank" rel="noopener noreferrer">View Resume</a>
                        <button onClick={() => handleDelete('resume', null, resumeURL)} style={{ marginLeft: '10px', color: 'red',backgroundColor:'#ffffff00',borderRadius:'20px' }}>
                            Delete
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => document.getElementById('resumeInput').click()}
                        style={{
                            padding: '5px 10px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                    >
                        Upload Resume
                    </button>
                )}
                <input
                    id="resumeInput"
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e, 'resume')}
                />
            </div>

           

            {/* Add Certificate Section */}
            <div style={{ marginTop: '20px' }} id='certificate'>
                <h4>Add a New Certificate</h4>
                <select
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value)}
                    style={{ padding: '5px', marginRight: '10px' }}
                >
                    {Object.keys(certifications).map((skill) => (
                        <option key={skill} value={skill}>
                            {skill}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => document.getElementById('fileInput').click()}
                    style={{
                        padding: '5px 10px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Upload Certificate
                </button>
                <input
                    id="fileInput"
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e, 'certificate')}
                />
            </div>

            {/* Certifications Display by Category */}
            <div style={{ marginTop: '30px' }} id='certificateTable'>
                <h4>Certifications</h4>
                {Object.entries(certifications).map(([skill, urls]) => (
                    <div key={skill} style={{ marginBottom: '20px' }}>
                        <h5>{skill} Certificates</h5>
                        {urls.length ? (
                            <div>
                                {urls.map((url, index) => (
                                    <div key={`${skill}-${index}`} style={{ marginBottom: '10px' }}>
                                        <a href={url} target="_blank" rel="noopener noreferrer">View Certificate {index + 1}</a>
                                        <button
                                            onClick={() => handleDelete('certificate', skill, url)}
                                            style={{marginLeft: '10px', color: 'red',backgroundColor:'#ffffff00',borderRadius:'20px' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No certificates for {skill}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ApplicantProfile;
