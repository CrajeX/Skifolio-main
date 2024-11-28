import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const HomeFeed = () => {
    const [posts, setPosts] = useState([]);
    const [showAddPostForm, setShowAddPostForm] = useState(false);
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostDescription, setNewPostDescription] = useState('');
    const [newPostImage, setNewPostImage] = useState(null);

    // Fetch posts from Firestore
    useEffect(() => {
        const fetchPosts = async () => {
            const postsCollection = collection(db, 'posts');
            const postSnapshot = await getDocs(postsCollection);
            const postList = postSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setPosts(postList);
        };
        fetchPosts();
    }, []);

    // Handle adding a new post
    const handleAddPost = async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                alert('User is not logged in.');
                return;
            }

            // Fetch current user's profile information from Firestore
            const userType = user.email.includes('employer') ? 'employers' : 'applicants'; // Adjust as necessary
            const userDocRef = doc(db, userType, user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                alert('User profile not found.');
                return;
            }

            // Extract user profile information
            const { name, profilePicURL } = userDoc.data();
            const imageUrl = await uploadPostImage();

            const newPost = {
                title: newPostTitle,
                description: newPostDescription,
                imageUrl,
                authorName: name,
                authorPhoto: profilePicURL || 'defaultProfilePic.jpg', // Ensure property name matches
                timestamp: serverTimestamp(),
            };

            await addDoc(collection(db, 'posts'), newPost);
            setPosts([...posts, newPost]);
            setShowAddPostForm(false);
            setNewPostTitle('');
            setNewPostDescription('');
            setNewPostImage(null);
        } catch (error) {
            console.error('Error adding post:', error);
        }
    };

    const uploadPostImage = async () => {
        if (newPostImage) {
            const imageRef = ref(storage, `posts/${newPostImage.name}`);
            await uploadBytes(imageRef, newPostImage);
            return await getDownloadURL(imageRef);
        }
        return '';
    };

    return (
        <div className="home-feed">
            <h1>Home Feed</h1>
            <div className="add-post-section">
                <button onClick={() => setShowAddPostForm(!showAddPostForm)}>
                    {showAddPostForm ? 'Cancel' : 'Add Post'}
                </button>
                {showAddPostForm && (
                    <div className="add-post-form">
                        <input
                            type="text"
                            placeholder="Title"
                            value={newPostTitle}
                            onChange={(e) => setNewPostTitle(e.target.value)}
                        />
                        <textarea
                            placeholder="Description"
                            value={newPostDescription}
                            onChange={(e) => setNewPostDescription(e.target.value)}
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setNewPostImage(e.target.files[0])}
                        />
                        <button onClick={handleAddPost}>Post</button>
                    </div>
                )}
            </div>
            <div className="posts-container">
                {posts.length === 0 ? (
                    <p>No posts available</p>
                ) : (
                    posts.map((post) => (
                        <div key={post.id} className="post">
                            <div className="post-header">
                                <img
                                    src={post.authorPhoto}
                                    alt="Author Profile"
                                    className="author-profile-pic"
                                />
                                <p>{post.authorName}</p>
                            </div>
                            <div className="post-content">
                                {post.imageUrl && (
                                    <img src={post.imageUrl} alt="Post" className="post-image" />
                                )}
                                <h3>{post.title}</h3>
                                <p>{post.description}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HomeFeed;
