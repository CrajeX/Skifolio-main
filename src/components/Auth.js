// src/components/Auth.js
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GithubAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const Auth = ({ userType, setUser }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [githubLink, setGithubLink] = useState('');
    const [companyName, setCompanyName] = useState(''); // State for employer's company name
    const [isSignUp, setIsSignUp] = useState(true); // Toggle between Sign Up and Sign In
    const navigate = useNavigate(); // For navigation post-sign-in
    const provider = new GithubAuthProvider();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let userCredential;
            if (isSignUp) {
                // Email Sign-Up Process
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
                setUser(userCredential.user);
                navigate('/signin'); // Redirect to a profile page after sign-in
                // Save applicant's info if userType is "applicant"
                if (userType === 'applicant') {
                    await setDoc(doc(db, 'applicants', userCredential.user.uid), {
                        name,
                        email,
                        githubLink,
                    });
                }
                // Save employer's info if userType is "employer"
                if (userType === 'employer') {
                    await setDoc(doc(db, 'employers', userCredential.user.uid), {
                        email,
                        companyName, // Save the company name
                    });
                }
            } else {
                // Email Sign-In Process
                navigate('/signin');
                userCredential = await signInWithEmailAndPassword(auth, email, password);
                setUser(userCredential.user);
            }
        } catch (error) {
            console.error("Error signing in/up:", error);
        }
    };

    const handleGithubSignIn = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const githubProfile = result.additionalUserInfo.profile;
            const githubLink = githubProfile.html_url;
            setUser(result.user);

            // Save GitHub link for applicants in Firestore
            if (userType === 'applicant') {
                await setDoc(doc(db, 'applicants', result.user.uid), {
                    name: result.user.displayName || '',
                    email: result.user.email || '',
                    githubLink,
                }, { merge: true });
            }
        } catch (error) {
            console.error("Error with GitHub sign-in:", error);
        }
    };

    return (
        <div className="hero">
        <div className='choicecontainer2'>
            <h2>{isSignUp ? "Sign Up" : "Sign In"} as {userType}</h2>
            <form onSubmit={handleSubmit}>
                <input
                    id='email'
                    className='input'
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    id='email'
                    className='input'
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                
                {isSignUp && userType === 'applicant' && (
                    <>
                        <input
                             id='email'
                            className='input'
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <input
                            id='email'
                            className='input'
                            type="text"
                            placeholder="GitHub Profile Link"
                            value={githubLink}
                            onChange={(e) => setGithubLink(e.target.value)}
                        />
                    </>
                )}
                
                {isSignUp && userType === 'employer' && (
                    <input
                        id='email'
                        className='input'
                        type="text"
                        placeholder="Company Name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                    />
                )}
                
                
                <button class="input submit" type="submit">{isSignUp ? "Sign Up" : "Sign In"}</button>
                {/* <button class="input submit" onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                 </button> */}
            </form>
            
        </div>
        </div>
    );
};

export default Auth;
