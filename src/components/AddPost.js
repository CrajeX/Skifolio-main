import React, { useState } from 'react';
import { db, storage } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const AddPost = ({ user, onClose }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState(null);

    const handleImageUpload = async () => {
        if (image) {
            const imageRef = ref(storage, `posts/${user.uid}/${image.name}`);
            await uploadBytes(imageRef, image);
            return await getDownloadURL(imageRef);
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const imageUrl = await handleImageUpload();
        await addDoc(collection(db, 'posts'), {
            title,
            description,
            authorName: user.displayName,
            authorPhoto: user.photoURL,
            imageUrl,
            timestamp: serverTimestamp(),
        });
        onClose(); // Close modal
    };

    return (
        <div className="modal">
            <h2>Add New Post</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <textarea
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                ></textarea>
                <input type="file" onChange={(e) => setImage(e.target.files[0])} />
                <button type="submit">Post</button>
                <button type="button" onClick={onClose}>Cancel</button>
            </form>
        </div>
    );
};

export default AddPost;
