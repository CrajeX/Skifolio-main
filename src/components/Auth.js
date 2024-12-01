import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GithubAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const Auth = ({ userType, setUser }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [githubLink, setGithubLink] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [isSignUp, setIsSignUp] = useState(true);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const navigate = useNavigate();
    const provider = new GithubAuthProvider();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSignUp && !agreedToTerms) {
            alert('Please accept the terms and conditions.');
            return;
        }
        try {
            let userCredential;
            if (isSignUp) {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
                setUser(userCredential.user);
                // Navigate to the appropriate profile page after sign-up
                if (userType === 'applicant') {
                    await setDoc(doc(db, 'applicants', userCredential.user.uid), {
                        name,
                        email,
                        githubLink,
                    });
                    navigate('/applicant/profile');  // Redirect to applicant profile
                } else if (userType === 'employer') {
                    await setDoc(doc(db, 'employers', userCredential.user.uid), {
                        email,
                        companyName,
                    });
                    navigate('/employer/profile');  // Redirect to employer profile
                }
            } else {
                userCredential = await signInWithEmailAndPassword(auth, email, password);
                setUser(userCredential.user);
                // Redirect to the appropriate profile page after sign-in
                if (userType === 'applicant') {
                    navigate('/applicant/profile');
                } else if (userType === 'employer') {
                    navigate('/employer/profile');
                }
            }
        } catch (error) {
            console.error("Error signing in/up:", error);
        }
    };

    return (
        <div className="hero" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className='choicecontainer2' style={{ textAlign: 'center', width: '100%', maxWidth: '400px' }}>
                <h2>{isSignUp ? "Sign Up" : "Sign In"} as {userType}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input
                        id='email'
                        className='input'
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ marginBottom: '10px', width: '100%' }}
                    />
                    <div style={{ position: 'relative', width: '100%', marginBottom: '10px', marginLeft: "-30PX" }}>
                        <input
                            id='password'
                            className='input'
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ width: '100%' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'black'
                            }}
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {isSignUp && userType === 'applicant' && (
                        <>
                            <input
                                id='name'
                                className='input'
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{ marginBottom: '10px', width: '100%' }}
                            />
                            <input
                                id='githubLink'
                                className='input'
                                type="text"
                                placeholder="GitHub Profile Link"
                                value={githubLink}
                                onChange={(e) => setGithubLink(e.target.value)}
                                style={{ marginBottom: '10px', width: '100%' }}
                            />
                            <div style={{ marginBottom: '20px', textAlign: 'center', width: '100%' }}>
                                <a
                                    href="https://github.com/signup"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#007bff', textDecoration: 'none' }}
                                >
                                    Don't have a GitHub account? Sign up here.
                                </a>
                            </div>
                        </>
                    )}

                    {isSignUp && userType === 'employer' && (
                        <input
                            id='companyName'
                            className='input'
                            type="text"
                            placeholder="Company Name"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                            style={{ marginBottom: '10px', width: '100%' }}
                        />
                    )}

                    <div style={{ marginBottom: '20px' }}>
                        <input
                            id="terms"
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            style={{ marginRight: '5px' }}
                        />
                        <label htmlFor="terms">
                            I agree to the <a href="https://www.termsandconditionsgenerator.com/" target="_blank" rel="noopener noreferrer">Terms and Conditions</a>
                        </label>
                    </div>

                    <button className="input submit" type="submit">
                        {isSignUp ? "Sign Up" : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Auth;
