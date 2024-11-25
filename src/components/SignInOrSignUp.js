// // src/components/SignUp.js
// import React, { useState } from 'react';
// import { auth, db } from '../firebase';
// import { createUserWithEmailAndPassword } from 'firebase/auth';
// import { doc, setDoc } from 'firebase/firestore';

// const SignUp = ({ userType, setUser }) => {
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');

//     const handleSignUp = async (e) => {
//         e.preventDefault();
//         try {
//             const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//             setUser(userCredential.user);
//             await setDoc(doc(db, userType + 's', userCredential.user.uid), {
//                 email,
//                 userType,
//             });
//         } catch (error) {
//             console.error("Error signing up:", error);
//         }
//     };

//     return (
//         <div>
//             <h2>Sign Up as {userType}</h2>
//             <form onSubmit={handleSignUp}>
//                 <input
//                     type="email"
//                     placeholder="Email"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     required
//                 />
//                 <input
//                     type="password"
//                     placeholder="Password"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     required
//                 />
//                 <button type="submit">Sign Up</button>
//             </form>
//         </div>
//     );
// };

// export default SignUp;

// src/components/SignInOrSignUp.js
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import SignIn from './SignIn'; // Assuming you have a SignIn component
import Auth from './Auth'; // Assuming you have a signup component
import '../style.css'
const SignInOrSignUp = () => {
    const { userType } = useParams(); // Get user type from URL parameters

    return (
        <div className='hero'>
        <div className='choicecontainer'>
            <h2>{userType === 'applicant' ? 'Applicant Sign In' : 'Employer Sign In'}</h2>
            {userType === 'applicant' ? (
                <SignIn />
            ) : (
                <SignIn />
            )}
            <h3>Or</h3>
            <Link to={`/signup`}>
                <button>Sign Up</button>
            </Link>
            <Link to={`/`}>
                <button>Change Role</button>
            </Link>
        </div>
        </div>
    );
};

export default SignInOrSignUp;
