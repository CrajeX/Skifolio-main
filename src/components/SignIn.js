import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const SignIn = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
    const navigate = useNavigate(); // For navigation post-sign-in

    const handleSignIn = async (e) => {
        e.preventDefault();
        try {
            // Sign in with email and password
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch user data from Firestore to check approval status
            const applicantDoc = await getDoc(doc(db, 'applicants', user.uid));
            const employerDoc = await getDoc(doc(db, 'employers', user.uid));
            const userDocToBeApproved = await getDoc(doc(db, 'userAccountsToBeApproved', user.uid));

            // Check if the user is in the 'userAccountsToBeApproved' collection (pending approval)
            if (userDocToBeApproved.exists()) {
                alert('Your account is pending approval. Please wait for admin approval.');
                await signOut(auth); // Log out the user
                navigate('/'); // Redirect to homepage
                return;
            }

            if (applicantDoc.exists()) {
                // Redirect to applicant profile if user is found in applicants collection
                navigate('/applicant/profile');
            } else if (employerDoc.exists()) {
                // Redirect to employer profile if user is found in employers collection
                navigate('/employer/profile');
            } else {
                console.error('User type not found in database.');
            }
        } catch (error) {
            console.error('Error signing in:', error);
        }
    };

    return (
        <div className='hero' style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className='choicecontainer' style={{ textAlign: 'center', width: '100%', maxWidth: '400px' }}>
                <h2>Sign In</h2>
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                    <div style={{ position: 'relative', width: '100%', marginBottom: '10px' }}>
                        <input
                            className='input'
                            id='password'
                            type={showPassword ? "text" : "password"} // Dynamic input type
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ width: '100%', marginLeft: '-2px' }}
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
                    <button className="input submit" type="submit">Sign In</button>
                </form>
            </div>
        </div>
    );
};

export default SignIn;
