import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const AdminPage = () => {
  const [employers, setEmployers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobApplicants, setJobApplicants] = useState({});
  const [allApplicants, setAllApplicants] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  // Fetch all employers and jobs
  useEffect(() => {
    const fetchEmployersAndJobs = async () => {
      try {
        const employersSnapshot = await getDocs(collection(db, "employers"));
        const employersData = employersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const jobsSnapshot = await getDocs(collection(db, "jobs"));
        const jobsData = jobsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setEmployers(employersData);
        setJobs(jobsData);
      } catch (error) {
        console.error("Error fetching employers or jobs: ", error);
      }
    };

    fetchEmployersAndJobs();
  }, []);

  // Fetch applicants for a specific job
  const fetchJobApplicants = async (jobId) => {
    try {
      const applicationsRef = collection(db, "jobs", jobId, "applications");
      const appSnapshot = await getDocs(applicationsRef);
      const applicantsData = appSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setJobApplicants((prev) => ({
        ...prev,
        [jobId]: applicantsData,
      }));
    } catch (error) {
      console.error("Error fetching job applicants: ", error);
    }
  };

  // Fetch all applicants in the database
  const fetchAllApplicants = async () => {
    try {
      const applicantsSnapshot = await getDocs(collection(db, "applicants"));
      const applicantsList = await Promise.all(
        applicantsSnapshot.docs.map(async (doc) => {
          const applicantData = doc.data();
          const userId = doc.id;

          // Fetch submissions for the applicant
          const submissionsRef = collection(db, "applicants", userId, "submissions");
          const submissionsSnapshot = await getDocs(submissionsRef);
          const submissions = submissionsSnapshot.docs.map((subDoc) => subDoc.data());

          // Fetch applied jobs for the applicant
          const appliedJobsRef = collection(db, "applicants", userId, "appliedJobs");
          const appliedJobsSnapshot = await getDocs(appliedJobsRef);
          const appliedJobs = appliedJobsSnapshot.docs.map((jobDoc) => jobDoc.data());

          return {
            ...applicantData,
            userId,
            submissions,
            appliedJobs,
          };
        })
      );

      setAllApplicants(applicantsList);
    } catch (error) {
      console.error("Error fetching all applicants: ", error);
    }
  };

  useEffect(() => {
    fetchAllApplicants();
  }, []);

  // Handle job selection
  const handleJobClick = (jobId) => {
    setSelectedJob(jobId);
    if (!jobApplicants[jobId]) {
      fetchJobApplicants(jobId);
    }
  };

  // Handle applicant selection
  const handleApplicantClick = (applicant) => {
    setSelectedApplicant(applicant);
  };

  // Close applicant modal
  const handleCloseApplicantModal = () => {
    setSelectedApplicant(null);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Admin Page</h2>

      {/* Employers Section */}
      <section>
        <h3>Employers</h3>
        {employers.map((employer) => (
          <div
            key={employer.id}
            style={{
              border: "1px solid #ddd",
              padding: "15px",
              marginBottom: "20px",
              borderRadius: "5px",
            }}
          >
            <h4>{employer.companyName}</h4>
            <p>
              <strong>Email:</strong> {employer.email}
            </p>

            {/* Jobs Posted by the Employer */}
            <h5>Jobs Posted</h5>
            {jobs
              .filter((job) => job.employerId === employer.id)
              .map((job) => (
                <div
                  key={job.id}
                  style={{
                    marginBottom: "10px",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                  }}
                  onClick={() => handleJobClick(job.id)}
                >
                  <p>
                    <strong>Job Title:</strong> {job.title}
                  </p>
                  <p>{job.description}</p>

                  {/* Applicants for the Job */}
                  {selectedJob === job.id && (
                    <div
                      style={{
                        marginTop: "10px",
                        border: "1px solid #ddd",
                        padding: "10px",
                        borderRadius: "5px",
                        maxHeight: "200px",
                        overflowY: "auto",
                      }}
                    >
                      <h5>Applicants:</h5>
                      {jobApplicants[job.id]?.length > 0 ? (
                        jobApplicants[job.id].map((applicant) => (
                          <div
                            key={applicant.id}
                            style={{
                              padding: "10px",
                              backgroundColor: "#f9f9f9",
                              marginBottom: "10px",
                              borderRadius: "5px",
                              cursor: "pointer",
                            }}
                            onClick={() => handleApplicantClick(applicant)}
                          >
                            <p>
                              <strong>Name:</strong> {applicant.name}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p>No applicants yet.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        ))}
      </section>

      {/* All Applicants Section */}
      <section>
        <h3>All Applicants</h3>
        {allApplicants.map((applicant) => (
          <div
            key={applicant.userId}
            style={{
              border: "1px solid #ddd",
              padding: "15px",
              marginBottom: "20px",
              borderRadius: "5px",
            }}
          >
            <h4>{applicant.name}</h4>
            <p>
              <strong>Email:</strong> {applicant.email}
            </p>
            <p>
              <strong>Resume:</strong>{" "}
              <a href={applicant.resumeURL} target="_blank" rel="noopener noreferrer">
                View Resume
              </a>
            </p>
            <p>
              <strong>GitHub:</strong>{" "}
              <a href={applicant.githubLink} target="_blank" rel="noopener noreferrer">
                GitHub Profile
              </a>
            </p>

            {/* Certifications */}
            <p>
              <strong>Certifications:</strong>{" "}
              {applicant.certifications
                ? Object.keys(applicant.certifications)
                    .map((skill) => `${skill}: ${applicant.certifications[skill].join(", ")}`)
                    .join("; ")
                : "No certifications available"}
            </p>

            {/* Submissions */}
            <h5>Submissions</h5>
            <ul>
              {applicant.submissions.map((submission, index) => (
                <li key={index}>
                     <p>
                    <strong>Github Live Demo Link:</strong>{" "}
                    <a
                      href={submission.liveDemoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Demo
                    </a>
                  </p>
                  <p>
                    <strong>Demo Video:</strong>{" "}
                    <a
                      href={submission.demoVideoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Demo
                    </a>
                  </p>
                  <p>
                    <strong>Scores:</strong> HTML: {submission.scores?.html || "N/A"}, CSS:{" "}
                    {submission.scores?.css || "N/A"}, JS:{" "}
                    {submission.scores?.javascript || "N/A"}
                  </p>
                </li>
              ))}
            </ul>

            {/* Applied Jobs */}
            <h5>Applied Jobs</h5>
            <ul>
              {applicant.appliedJobs.map((job, index) => (
                <li key={index}>
                  <p>
                    <strong>Job Title:</strong> {job.title}
                  </p>
                  <p>
                    <strong>Company:</strong> {job.companyName}
                  </p>
                  <p>
                    <strong>Applied At:</strong>{" "}
                    {job.appliedAt?.toDate().toLocaleString() || "N/A"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Applicant Modal */}
      {selectedApplicant && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor:"#fff",
               padding: "20px",
                borderRadius: "5px",
                 maxWidth: "500px", 
                 width: "100%", }} >
                     <h4>Applicant Details</h4>
                      <p> <strong>Name:</strong> 
                      {selectedApplicant.name} </p> 
                      <p> <strong>Email:</strong> 
                      {selectedApplicant.email} </p>
                       <p> <strong>Resume:</strong>{" "}
                        <a href={selectedApplicant.resumeURL}
                         target="_blank" rel="noopener noreferrer" > 
                         View Resume </a> </p> <p>
                             <strong>Certifications:</strong>
                             {" "} {selectedApplicant.certifications?.length >
                              0 ? selectedApplicant.certifications.join(", ") :
                               "No certifications available"} </p> 
                               <button onClick={handleCloseApplicantModal}>Close</button>
                                </div> </div> )} </div> ); };

export default AdminPage;