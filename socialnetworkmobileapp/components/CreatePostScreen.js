import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useContext } from 'react';
import { MyUserContext } from "../configs/UserContexts";
import { ScrollView, Alert, View, TextInput, StyleSheet, Image, Text } from 'react-native';
import { Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { endpoints } from '../configs/APIs';
import axios from '../configs/APIs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const CreatePostScreen = ({ route }) => {
    const user = useContext(MyUserContext);
    const [content, setContent] = useState('');
    const [images, setImages] = useState([]);
    const [surveyType, setSurveyType] = useState('');
    const [endTime, setEndTime] = useState('');
    const [questions, setQuestions] = useState([{ question: '', options: [{ option: '' }] }]);
    const navigation = useNavigation();

    useEffect(() => {
        if (route.params?.surveyType) setSurveyType(route.params.surveyType);
        if (route.params?.endTime) setEndTime(new Date(route.params.endTime));
        if (route.params?.questions) setQuestions(route.params.questions);
    }, [route.params]);

    // Chọn ảnh từ thư viện
    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 1,
        });

        if (!result.canceled) {
            setImages(result.assets);
        }
    };

    // Function to delete an image
    const deleteImage = (index) => {
        setImages(images.filter((_, i) => i !== index));
    };

    // Lấy token từ AsyncStorage
    const getToken = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                return token;
            } else {
                throw new Error('Không tìm thấy token.');
            }
        } catch (error) {
            console.error("Lỗi khi lấy token:", error);
            return null;
        }
    };

    // Gửi bài post lên server
    const submitPost = async () => {
        if (!content) {
            Alert.alert("Đăng bài", "Vui lòng nhập nội dung bài viết.");
            return;
        }

        const token = await getToken();

        const formData = new FormData();
        formData.append('content', content);

        // Thêm ảnh vào formData
        images.forEach((image, index) => {
            formData.append('images', {
                uri: image.uri,
                type: 'image/jpeg',
                name: `image-${index}.jpg`,
            });
        });

        const isSurveyTypeValid = surveyType !== '';
        const isEndTimeValid = endTime instanceof Date && !isNaN(endTime);
        const areQuestionsValid = Array.isArray(questions) && questions.length > 0 && questions.every(q => q.question !== '' && Array.isArray(q.options) && q.options.length > 0);

        if (isSurveyTypeValid && isEndTimeValid && areQuestionsValid) {

            formData.append('survey_type', surveyType);
            formData.append('end_time', endTime.toISOString());
            formData.append('questions', JSON.stringify(questions));
            console.info(formData);
            try {
                const response = await axios.post(endpoints['survey'], formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (response.status === 201) {
                    Alert.alert('Đăng bài thành công!');
                    navigation.navigate('HomeStack', { screen: 'HomeScreen' });
                } else {
                    Alert.alert('Đăng bài không thành công');
                }
            } catch (error) {
                console.error("Error submitting post:", error);
                Alert.alert('Đã xảy ra lỗi. Vui lòng thử lại.');
            }
        }
        else
            try {
                const response = await axios.post(endpoints.post, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.status === 201) {
                    Alert.alert('Đăng bài thành công!');
                    navigation.navigate('HomeScreen');
                } else {
                    Alert.alert('Đăng bài không thành công');
                }
            } catch (error) {
                console.error("Error submitting post:", error);
                Alert.alert('Đã xảy ra lỗi. Vui lòng thử lại.');
            }
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <View style={styles.post}>
                    <Image source={{ uri: user.avatar.replace(/^image\/upload\//, "") }} style={styles.avatar} />
                    <View>
                        <Text style={styles.username}>{user.first_name} {user.last_name}</Text>
                    </View>
                </View>
                <TextInput
                    style={styles.input}
                    multiline
                    placeholder="Nhập nội dung bài viết..."
                    value={content}
                    onChangeText={setContent}
                />
                <ScrollView horizontal style={styles.imageScrollView}>
                    {images.map((image, index) => (
                        <View key={index} style={styles.imageContainer}>
                            <Image
                                source={{ uri: image.uri }}
                                style={styles.image}
                            />
                            <Ionicons
                                name="close-circle"
                                size={30}
                                color="black"
                                style={styles.deleteIcon}
                                onPress={() => deleteImage(index)}
                            />
                        </View>
                    ))}
                </ScrollView>
            </ScrollView>
            <View style={styles.buttonContainer}>
                <Button style={styles.pickImagesButton} mode="outlined" onPress={pickImages}>Chọn ảnh</Button>
                {user.role === 0 && (
                    <>
                        <Button style={styles.createSurveyButton} mode="outlined" onPress={() => navigation.navigate('CreateSurveyScreen', { surveyType, endTime, questions})}>Tạo khảo sát</Button>
                        <Button style={styles.createInvitationButton} mode="outlined">Tạo thư mời</Button>
                    </>
                )}
                <Button style={styles.submitButton} mode="contained" onPress={submitPost}>Đăng bài</Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    post: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 30,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10
    },
    username: {
        fontSize: 18,
        fontWeight: "bold"
    },
    scrollView: {
        padding: 20,
    },
    input: {
        padding: 10,
        minHeight: 50,
        textAlignVertical: 'top',
        marginBottom: 10,
    },
    imageScrollView: {
        marginVertical: 10,
        paddingVertical: 5,
    },
    image: {
        width: 170,
        height: 170,
        margin: 5,
        borderRadius: 8,
    },
    buttonContainer: {
        flexDirection: 'column',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderColor: 'black',
    },
    submitButton: {
        borderRadius: 20,
        backgroundColor: '#007BFF',
        padding: 10,
        margin: 20,
    },
    pickImagesButton: {
        borderRadius: 10,
        borderColor: '#28A745',
        borderWidth: 2,
        marginStart: 100,
        marginEnd: 100,
        marginBottom: 20,
        marginTop: 20,
    },
    createSurveyButton: {
        borderRadius: 10,
        borderColor: '#FFC107',
        borderWidth: 2,
        marginStart: 100,
        marginEnd: 100,
        marginBottom: 20,
    },
    createInvitationButton: {
        borderRadius: 10,
        borderColor: '#17A2B8',
        borderWidth: 2,
        marginStart: 100,
        marginEnd: 100,
    },
    imageContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    deleteIcon: {
        position: 'absolute',
        top: 5,
        right: 5,
    },
});

export default CreatePostScreen;
