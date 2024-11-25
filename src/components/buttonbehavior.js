export function turnBlack(event) {
    event.preventDefault(); // Prevent immediate navigation
    event.target.style.backgroundColor = "black"; // Change the color of the clicked button
    
    // Allow the color change to be visible before navigating
    setTimeout(() => {
        event.target.closest('a').click(); // Trigger the actual navigation after a short delay
    }, 100); // Adjust delay if needed
}
