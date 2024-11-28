// src/components/ProfileSetup.js
import React, { useState } from 'react';
import { db, storage, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const ProfileSetup = () => {
    const [profilePic, setProfilePic] = useState(null);
    const [coverPhoto, setCoverPhoto] = useState(null);
    const navigate = useNavigate();

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (type === 'profilePic') {
            setProfilePic(file);
        } else if (type === 'coverPhoto') {
            setCoverPhoto(file);
        }
    };

    const handleSaveProfile = async () => {
        try {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            let profilePicURL = '';
            let coverPhotoURL = '';

            // Upload profile photo if selected
            if (profilePic) {
                const profilePicRef = ref(storage, `users/${auth.currentUser.uid}/profilePic`);
                await uploadBytes(profilePicRef, profilePic);
                profilePicURL = await getDownloadURL(profilePicRef);
            }

            // Upload cover photo if selected
            if (coverPhoto) {
                const coverPhotoRef = ref(storage, `users/${auth.currentUser.uid}/coverPhoto`);
                await uploadBytes(coverPhotoRef, coverPhoto);
                coverPhotoURL = await getDownloadURL(coverPhotoRef);
            }

            // Update Firestore with URLs and mark profile as complete
            await updateDoc(userDocRef, {
                profilePicURL,
                coverPhotoURL,
                profileComplete: true
            });

            navigate('/applicant/profile'); // Redirect to the profile page
        } catch (error) {
            console.error("Error saving profile:", error);
        }
    };

    return (
        <div>
            <h2>Set Up Your Profile</h2>
            <div>
                <label>Profile Photo:</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'profilePic')} />
            </div>
            <div>
                <label>Cover Photo:</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'coverPhoto')} />
            </div>
            <button onClick={handleSaveProfile}>Save Profile</button>
        </div>
    );
};

export default ProfileSetup;
