import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const SignIn = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate(); // For navigation post-sign-in

    const handleSignIn = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/profile'); // Redirect to a profile page after sign-in
        } catch (error) {
            console.error("Error signing in:", error);
        }
    };

    return (
        <div className='hero'>
        <div className='choicecontainer'>
            <h2>Sign In</h2>
            <form onSubmit={handleSignIn}>
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
                    className='input'
                    id='password'
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button class="input submit" type="submit">Sign In</button>
            </form>
        </div>
        </div>
    );
};

export default SignIn;
