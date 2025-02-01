import { StyleSheet} from "react-native";

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
});