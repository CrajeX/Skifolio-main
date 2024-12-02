import React, { useState } from 'react';
import { auth, db, storage } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const Auth = ({ userType, setUser }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [githubLink, setGithubLink] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [businessPermit, setBusinessPermit] = useState(null);
    const [isSignUp, setIsSignUp] = useState(true);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSignUp && !agreedToTerms) {
            alert('Please accept the terms and conditions.');
            return;
        }

        try {
            let userCredential;

            if (isSignUp) {
                // Sign-up logic
                userCredential = await createUserWithEmailAndPassword(auth, email, password);

                // Upload business permit to Firebase Storage if employer
                let businessPermitURL = null;
                if (userType === 'employer' && businessPermit) {
                    const storageRef = ref(storage, `businessPermits/${userCredential.user.uid}`);
                    await uploadBytes(storageRef, businessPermit);
                    businessPermitURL = await getDownloadURL(storageRef);
                }

                // Prepare user data
                const userData = {
                    email,
                    type: userType,
                    status: 'pending', // Mark as pending approval
                };

                if (userType === 'applicant') {
                    userData.name = name;
                    userData.githubLink = githubLink;
                } else if (userType === 'employer') {
                    userData.companyName = companyName;
                    userData.businessPermit = businessPermitURL;
                }

                // Save user data in "userAccountsToApprove" and "userAccountsToBeApproved" collections
                await setDoc(doc(db, 'userAccountsToApprove', userCredential.user.uid), userData);
                await setDoc(doc(db, 'userAccountsToBeApproved', userCredential.user.uid), userData);

                // Immediately log the user out after sign-up
                await signOut(auth);
                alert('Your account has been created and is pending approval. Please wait for admin approval.');
                navigate('/');
            } else {
                // Sign-In Logic
                userCredential = await signInWithEmailAndPassword(auth, email, password);
                const uid = userCredential.user.uid;

                // Fetch user approval status from both collections
                const userDocToApprove = await getDoc(doc(db, 'userAccountsToApprove', uid));
                const userDocToBeApproved = await getDoc(doc(db, 'userAccountsToBeApproved', uid));

                if (!userDocToApprove.exists()) {
                    alert('Your account is not found. Please sign up.');
                    await signOut(auth); // Immediately log them out
                    navigate('/');
                    return;
                }

                const userData = userDocToApprove.data();

                // Check if the user is in 'userAccountsToBeApproved' (i.e., waiting for approval)
                if (userDocToBeApproved.exists()) {
                    alert('Your account is pending approval. Please wait for admin approval.');
                    await signOut(auth); // Immediately log them out
                    navigate('/');
                    return;
                }

                // If the account is not in 'userAccountsToBeApproved', check if it is approved
                if (userData.status !== 'approved') {
                    alert('Your account is not yet approved. Please wait for admin approval.');
                    await signOut(auth); // Immediately log them out
                    navigate('/');
                    return;
                }

                // Proceed if approved
                setUser(userCredential.user);
                navigate(userData.type === 'employer' ? '/employer/profile' : '/applicant/profile');
            }
        } catch (error) {
            console.error('Error signing in/up:', error);
            alert('An error occurred. Please try again.');
        }
    };

    const handleFileChange = (e) => {
        setBusinessPermit(e.target.files[0]);
    };

    return (
        <div className="hero" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="choicecontainer2" style={{ textAlign: 'center', width: '100%', maxWidth: '400px' }}>
                <h2>{isSignUp ? 'Sign Up' : 'Sign In'} as {userType}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input
                        id="email"
                        className="input"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ marginBottom: '10px', width: '100%' }}
                    />
                    <div style={{ position: 'relative', width: '100%', marginBottom: '10px' }}>
                        <input
                            id="password"
                            className="input"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ width: '100%', marginLeft: '-1px' }}
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
                                color: 'black',
                            }}
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {isSignUp && userType === 'applicant' && (
                        <>
                            <input
                                id="name"
                                className="input"
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{ marginBottom: '10px', width: '100%' }}
                            />
                            <input
                                id="githubLink"
                                className="input"
                                type="text"
                                placeholder="GitHub Profile Link"
                                value={githubLink}
                                onChange={(e) => setGithubLink(e.target.value)}
                                style={{ marginBottom: '10px', width: '100%' }}
                            />
                        </>
                    )}

                    {isSignUp && userType === 'employer' && (
                        <>
                            <input
                                id="companyName"
                                className="input"
                                type="text"
                                placeholder="Company Name"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                                style={{ marginBottom: '10px', width: '100%' }}
                            />
                            <input
                                id="businessPermit"
                                className="input"
                                type="file"
                                onChange={handleFileChange}
                                required
                                style={{ marginBottom: '10px', width: '100%' }}
                            />
                        </>
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
                            I agree to the{' '}
                            <a href="https://www.termsandconditionsgenerator.com/" target="_blank" rel="noopener noreferrer">
                                Terms and Conditions
                            </a>
                        </label>
                    </div>

                    <button className="input submit" type="submit">
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Auth;
