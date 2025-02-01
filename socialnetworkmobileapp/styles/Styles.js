import { StyleSheet } from "react-native";

export default StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    }, row: {
        flexDirection: "row",
        flexWrap: "wrap"
    }, margin: {
        margin: 5
    }, subject: {
        fontSize: 25,
        color: "blue",
        fontWeight: "bold"
    }, box: {
        width: 80,
        height: 80,
        borderRadius: 10
    }, menuContainer: {
        flex: 1, // Ensures the container takes up the full screen
        backgroundColor: '#f0f0f0', // Light background color
        padding: 20,
        justifyContent: 'center', // Centers buttons vertically
        alignItems: 'center', // Centers buttons horizontally
    }, menuItem: {
        backgroundColor: '#38559a', // Blue button color
        padding: 15,
        borderRadius: 15, // Rounded corners
        marginVertical: 10, // Space between buttons
        width: '90%', // Button width (adjust as needed)
        height: 50,
        alignItems: 'center', // Center text within button
        elevation: 3, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: { width: 0, height: 2 }, // iOS shadow
        shadowOpacity: 0.2, // iOS shadow
        shadowRadius: 2, // iOS shadow
    }, menuText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
})