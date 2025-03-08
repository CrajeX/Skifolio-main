// /**
//  * 
//  * New AUTH.js 
//  * February 26 2025
//  */


// import React, { useState } from 'react';
// import { auth, db, storage } from '../firebase';
// import { useNavigate } from 'react-router-dom';
// import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
// import { doc, setDoc, getDoc } from 'firebase/firestore';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// const Auth = ({ userType, setUser }) => {
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
//     const [showPassword, setShowPassword] = useState(false);
//     const [name, setName] = useState('');
//     const [githubLink, setGithubLink] = useState('');
//     const [companyName, setCompanyName] = useState('');
//     const [businessPermit, setBusinessPermit] = useState(null);
//     const [isSignUp, setIsSignUp] = useState(true);
//     const [agreedToTerms, setAgreedToTerms] = useState(false);
//     const navigate = useNavigate();
//     const [isOpen, setIsOpen] = useState(false);
//     const [isBlurred, setIsBlurred] = useState(false);
//     const [isVerified, setIsVerified] = useState(false); // Track verification status
//     const toggleBlur = () => setIsBlurred(!isBlurred);
//     const hardcodedCode = "ABCDEF";


//     // EMAIL VERIFICATION METHOD
//     const handleEmailVerification = () => {
//         if (email.trim() === '') {
//             alert("Please enter your email first!");
//             return;
//         }
//         if (code.trim().toUpperCase() === hardcodedCode) {
//             setIsVerified(true);
//             handleSubmit({ preventDefault: () => {} });
//         }
//         else {
//             alert("Incorrect code. Please try again.");
//         }
//         setIsOpen(true); // Open verification input
//         toggleBlur(); // Blur the background
//     };
//     const handleCodeSubmission = () => {
//         if (code.trim().toUpperCase() === hardcodedCode) {
//             setIsVerified(true);
//             setIsOpen(false);
//             toggleBlur();
//             handleSubmit({ preventDefault: () => {} }); // Pass a mock event
//         } else {
//             alert("Incorrect code. Please try again.");
//         }
//     };
    
    
    
//     var emails = "12345";
//         const [code, setCode] = useState("");
//         const [isCorrect, setIsCorrect] = useState(false);
//         // Change this to your required code
      
//         const handleChange = (e) => {
//           const input = e.target.value.toUpperCase(); // Convert to uppercase
//           setCode(input);
//           setIsCorrect(input === hardcodedCode); // Check if input matches the hardcoded code
//         };

//     const myDiv = document.getElementById("formauth");

//     const blurDiv = () => {
//         const div = document.getElementById("myDiv");
//         if (div) {
//           div.style.filter = "blur(5px)";
//         }
//       };
      
        
//     const unblurDiv = () => {
//             myDiv.style.filter = "blur(0px)";
//         };
        
//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         if (!isVerified){
//             alert("Please verify your email before signing up.");
//             return;
//         };
        

//         if (isSignUp && !agreedToTerms) {
//             alert('Please accept the terms and conditions.');
//             return;
//         }

//         try {
//             let userCredential;

//             if (isSignUp) {
//                 // Sign-up logic
//                 userCredential = await createUserWithEmailAndPassword(auth, email, password);

//                 // Upload business permit to Firebase Storage if employer
//                 let businessPermitURL = null;
//                 if (userType === 'employer' && businessPermit) {
//                     const storageRef = ref(storage, `businessPermits/${userCredential.user.uid}`);
//                     await uploadBytes(storageRef, businessPermit);
//                     businessPermitURL = await getDownloadURL(storageRef);
//                 }

//                 // Prepare user data
//                 const userData = {
//                     email,
//                     type: userType,
//                     status: 'pending', // Mark as pending approval
//                 };

//                 if (userType === 'applicant') {
//                     userData.name = name;
//                     userData.githubLink = githubLink;
//                 } else if (userType === 'employer') {
//                     userData.companyName = companyName;
//                     userData.businessPermit = businessPermitURL;
//                 }

//                 // Save user data in "userAccountsToApprove" and "userAccountsToBeApproved" collections
//                 await setDoc(doc(db, 'userAccountsToApprove', userCredential.user.uid), userData);
//                 await setDoc(doc(db, 'userAccountsToBeApproved', userCredential.user.uid), userData);

//                 // Immediately log the user out after sign-up
//                 await signOut(auth);
//                 alert('Your account has been created and is pending approval. Please wait for admin approval.');
//                 navigate('/');
//             } else {
//                 // Sign-In Logic
//                 userCredential = await signInWithEmailAndPassword(auth, email, password);
//                 const uid = userCredential.user.uid;

//                 // Fetch user approval status from both collections
//                 const userDocToApprove = await getDoc(doc(db, 'userAccountsToApprove', uid));
//                 const userDocToBeApproved = await getDoc(doc(db, 'userAccountsToBeApproved', uid));

//                 if (!userDocToApprove.exists()) {
//                     alert('Your account is not found. Please sign up.');
//                     await signOut(auth); // Immediately log them out
//                     navigate('/');
//                     return;
//                 }

//                 const userData = userDocToApprove.data();

//                 // Check if the user is in 'userAccountsToBeApproved' (i.e., waiting for approval)
//                 if (userDocToBeApproved.exists()) {
//                     alert('Your account is pending approval. Please wait for admin approval.');
//                     await signOut(auth); // Immediately log them out
//                     navigate('/');
//                     return;
//                 }

//                 // If the account is not in 'userAccountsToBeApproved', check if it is approved
//                 if (userData.status !== 'approved') {
//                     alert('Your account is not yet approved. Please wait for admin approval.');
//                     await signOut(auth); // Immediately log them out
//                     navigate('/');
//                     return;
//                 }

//                 // Proceed if approved
//                 setUser(userCredential.user);
//                 navigate(userData.type === 'employer' ? '/employer/profile' : '/applicant/profile');
//             }
//         } catch (error) {
//             console.error('Error signing in/up:', error);
//             alert('An error occurred. Please try again.');
//         }
//         }
       

//     const handleFileChange = (e) => {
//         setBusinessPermit(e.target.files[0]);
//     };

//     return (
//         <div className="hero" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
//             <div className="choicecontainer2" style={{ textAlign: 'center', width: '100%', maxWidth: '400px' }}>

//                 <form
//                     onSubmit={handleSubmit}
//                     id="formauth"
//                     style={{
                       
//                         display: "flex",
//                         flexDirection: "column",
//                         alignItems: "center",
//                         position:"relative"
//                     }}
                    
//                     >
//                     <h2 style={{fontFamily: "times new roman"}}>{isSignUp ? 'Sign Up' : 'Sign In'} as {userType}</h2>

//                     <input
//                         id="email"
//                         className="input"
//                         type="email"
//                         placeholder="Email"
//                         value={email}
//                         onChange={(e) => setEmail(e.target.value)}
//                         required
//                         style={{ marginBottom: '10px', width: '100%' , filter: isBlurred ? "blur(5px)" : "none",}}
//                     />
//                     <div style={{ position: 'relative', width: '100%', marginBottom: '10px' , filter: isBlurred ? "blur(5px)" : "none", }}>
//                         <input
//                             id="password"
//                             className="input"
//                             type={showPassword ? 'text' : 'password'}
//                             placeholder="Password"
//                             value={password}
//                             onChange={(e) => setPassword(e.target.value)}
//                             required
//                             style={{ width: '100%', marginLeft: '-1px' }}
//                         />
//                         <button
//                             type="button"
//                             onClick={() => setShowPassword(!showPassword)}
//                             style={{
//                                 position: 'absolute',
//                                 right: '10px',
//                                 top: '50%',
//                                 transform: 'translateY(-50%)',
//                                 background: 'none',
//                                 border: 'none',
//                                 cursor: 'pointer',
//                                 color: 'black',
//                                 filter: isBlurred ? "blur(5px)" : "none",
//                             }}
//                         >
//                             {showPassword ? 'Hide' : 'Show'}
//                         </button>
//                     </div>

//                     {isSignUp && userType === 'applicant' && (
//                         <>
//                             <input
//                                 id="name"
//                                 className="input"
//                                 type="text"
//                                 placeholder="Full Name"
//                                 value={name}
//                                 onChange={(e) => setName(e.target.value)}
//                                 required
//                                 style={{ marginBottom: '10px', width: '100%', filter: isBlurred ? "blur(5px)" : "none", }}
//                             />
//                             <input
//                                 id="githubLink"
//                                 className="input"
//                                 type="text"
//                                 placeholder="GitHub Profile Link"
//                                 value={githubLink}
//                                 onChange={(e) => setGithubLink(e.target.value)}
//                                 style={{ marginBottom: '10px', width: '100%', filter: isBlurred ? "blur(5px)" : "none", }}
//                             />
//                         </>
//                     )}

//                     {isSignUp && userType === 'employer' && (
//                         <>
//                             <input
//                                 id="companyName"
//                                 className="input"
//                                 type="text"
//                                 placeholder="Company Name"
//                                 value={companyName}
//                                 onChange={(e) => setCompanyName(e.target.value)}
//                                 required
//                                 style={{ marginBottom: '10px', width: '100%' , filter: isBlurred ? "blur(5px)" : "none",}}
//                             />
//                             <input
//                                 id="businessPermit"
//                                 className="input"
//                                 type="file"
//                                 onChange={handleFileChange}
//                                 required
//                                 style={{ marginBottom: '10px', width: '100%' , filter: isBlurred ? "blur(5px)" : "none",}}
//                             />
//                         </>
//                     )}

//                     <div style={{ marginBottom: '20px' }}>
//                         <input
//                             id="terms"
//                             type="checkbox"
//                             checked={agreedToTerms}
//                             onChange={(e) => setAgreedToTerms(e.target.checked)}
//                             style={{ marginRight: '5px' , filter: isBlurred ? "blur(5px)" : "none", }}
//                         />
//                         <label htmlFor="terms" style={{filter: isBlurred ? "blur(5px)" : "none",}}>
//                             I agree to the{' '}
//                             <a href="https://www.termsandconditionsgenerator.com/" target="_blank" rel="noopener noreferrer">
//                                 Terms and Conditions
//                             </a>
//                         </label>
//                     </div>
                    
//                     {/* 
//                     START CHANGED Verify Email button
//                     */}
//                     <button 
//                         type="button"
//                         className="verify-email-btn"
//                         onClick={() => { 
//                             if (email.trim() === '') { 
//                                 alert("Please enter your email first!"); 
//                                 return; 
//                             } 
//                             setIsOpen(true); 
//                             toggleBlur(); 
//                         }} 
//                         style={{
//                             filter: isBlurred ? "blur(5px)" : "none",
//                         }}
//                     >
//                         Verify Email
//                     </button>
//                 {/* 
//                 END CHANGED Verify Email button
//                 */}

//                 {isOpen &&(
//                         <label id='emailverify'
//                          // Ensure this is not blurred
//                          onSubmit={handleSubmit}
//                         >
//                         Check Email For a Sent Code
//                     <div className="flex flex-col items-center gap-4 p-6" 
//                     style={{ filter: "none" }}
//                     >
//                     <input
//                         type="text"
//                         value={code}
//                         onChange={handleChange}
//                         placeholder="Enter code"
//                         maxLength={6}
//                         className="p-2 border border-gray-300 rounded-md text-center text-lg"
//                     />
//                      <button   className="input submit"
//                         type="submit"
                        
//                         onClick={() => {
//                             setIsOpen(false); // Close the popup
//                             blurDiv(); // Blur the div
//                             handleEmailVerification();
                            
//                         }} >
                            
//                         {isSignUp ? 'Sign Up' : 'Sign In'}
//                     </button>
//                     </div>
//                     </label>
//                     )}
//                 </form>
                
                
//             </div>
           
//         </div>
        
//     );
// };

// export default Auth;

import React, { useState } from 'react';
import { auth, db, storage } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    sendEmailVerification 
} from 'firebase/auth';
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
                // **Sign-Up Logic**
                userCredential = await createUserWithEmailAndPassword(auth, email, password);

                // **Send verification email**
                await sendEmailVerification(userCredential.user);
                alert('A verification email has been sent. Please verify before signing in.');

                // **Upload business permit if employer**
                let businessPermitURL = null;
                if (userType === 'employer' && businessPermit) {
                    const storageRef = ref(storage, `businessPermits/${userCredential.user.uid}`);
                    await uploadBytes(storageRef, businessPermit);
                    businessPermitURL = await getDownloadURL(storageRef);
                }

                // **Save user data**
                const userData = {
                    email,
                    type: userType,
                    status: 'pending',
                    name: userType === 'applicant' ? name : null,
                    githubLink: userType === 'applicant' ? githubLink : null,
                    companyName: userType === 'employer' ? companyName : null,
                    businessPermit: userType === 'employer' ? businessPermitURL : null
                };

                await setDoc(doc(db, 'userAccountsToApprove', userCredential.user.uid), userData);
                await setDoc(doc(db, 'userAccountsToBeApproved', userCredential.user.uid), userData);

                // **Log out after sign-up**
                await signOut(auth);
                navigate('/');
                return;
            } else {
                // **Sign-In Logic**
                userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // **Check if email is verified**
                if (!user.emailVerified) {
                    alert('Please verify your email before signing in.');
                    await signOut(auth);
                    navigate('/');
                    return;
                }

                const uid = user.uid;
                const userDocToApprove = await getDoc(doc(db, 'userAccountsToApprove', uid));
                const userDocToBeApproved = await getDoc(doc(db, 'userAccountsToBeApproved', uid));

                if (!userDocToApprove.exists()) {
                    alert('Your account is not found. Please sign up.');
                    await signOut(auth);
                    navigate('/');
                    return;
                }

                const userData = userDocToApprove.data();

                // **Check if user is pending approval**
                if (userDocToBeApproved.exists()) {
                    alert('Your account is pending approval. Please wait for admin approval.');
                    await signOut(auth);
                    navigate('/');
                    return;
                }

                // **Check if account is approved**
                if (userData.status !== 'approved') {
                    alert('Your account is not yet approved. Please wait for admin approval.');
                    await signOut(auth);
                    navigate('/');
                    return;
                }

                // **Login successful**
                setUser(user);
                navigate(userData.type === 'employer' ? '/employer/profile' : '/applicant/profile');
            }
        } catch (error) {
            console.error('Error signing in/up:', error);
            alert('An error occurred. Please try again.');
        }
    };

    return (
        <div className="hero" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="choicecontainer2" style={{ textAlign: 'center', width: '100%', maxWidth: '400px' }}>
                <form onSubmit={handleSubmit} id="formauth" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <h2 style={{ fontFamily: "times new roman" }}>{isSignUp ? 'Sign Up' : 'Sign In'} as {userType}</h2>

                    <input
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
                            className="input"
                            type={showPassword ? 'text' : 'password'}
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
                                color: 'black',
                            }}
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {isSignUp && userType === 'applicant' && (
                        <>
                            <input
                                className="input"
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{ marginBottom: '10px', width: '100%' }}
                            />
                            <input
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
                                className="input"
                                type="text"
                                placeholder="Company Name"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                                style={{ marginBottom: '10px', width: '100%' }}
                            />
                            <input
                                className="input"
                                type="file"
                                onChange={(e) => setBusinessPermit(e.target.files[0])}
                                required
                                style={{ marginBottom: '10px', width: '100%' }}
                            />
                        </>
                    )}

                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            style={{ marginRight: '5px' }}
                        />
                        <label>
                            I agree to the <a href="https://www.termsandconditionsgenerator.com/" target="_blank" rel="noopener noreferrer">Terms and Conditions</a>
                        </label>
                    </div>

                    <button type="submit" className="input submit">
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Auth;
