import { StyleSheet } from "react-native";
import { hp } from "../../styles/common";
import { theme } from "../../styles/theme";

export default styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    view: {
        marginTop: 30,
        padding: 20,
    },
    scrollView: {
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    info: {
        fontSize: 18,
        marginBottom: 10,
    },
    input: {
        marginBottom: 15,
        backgroundColor: 'white',
    },
    imagePicker: {
        marginBottom: 15,
    },
    imagePickerText: {
        color: '#38559a', // Blue color
    },
    imagePickerTextError: {
        color: 'red',
    },
    imageContainer: { // Added container for image
        alignItems: 'center', // Center the image horizontally
        marginBottom: 15,
    },
    image: {
        width: 75, // Increased image size
        height: 75,
        marginBottom: 15,
    },
    button: {
        marginTop: 20,
    },
    switch: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 30,
    },
    switchText: {
        alignItems: 'center',
        color: 'black',
    },
    cardContainer: {
        flex: 1,
        justifyContent: 'center',  // Vertically center the card
        alignItems: 'center',      // Horizontally center the card
        backgroundColor: '#f0f0f0', // Light background
        padding: 20, // Add some padding to the container
    },
    profileCard: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 20,
        margin: 30,
        alignItems: 'center', // Center content horizontally
        elevation: 5, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: { width: 0, height: 2 }, // iOS shadow
        shadowOpacity: 0.3, // iOS shadow
        shadowRadius: 4, // iOS shadow
        width: '80%', // Occupy most of the screen width
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,  // Make it circular
        marginBottom: 10, // Space below the avatar
    },
    textContainer: { // Style for text content
        alignItems: 'center', // Center text within container
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    username: {
        fontSize: 16,
        color: '#555', // Slightly darker color
        marginBottom: 5,
        color: theme.colors.textDark,
        fontWeight: theme.fonts.bold,
    },
    email: {
        fontSize: 14,
        color: '#777', // Lighter color for email
    },
});