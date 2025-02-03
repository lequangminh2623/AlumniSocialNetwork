import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useContext } from 'react';
import { MyUserContext } from "../configs/UserContexts";
import { ScrollView, Alert, View, TextInput, StyleSheet, Image, Text } from 'react-native';
import { Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { endpoints } from '../configs/APIs';
import axios from '../configs/APIs';
import { useNavigation } from '@react-navigation/native';

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
                    navigation.goBack();
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
                        <Text style={styles.username}>{user.username}</Text>
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
                        <Image
                            key={index}
                            source={{ uri: image.uri }}
                            style={styles.image}
                        />
                    ))}
                </ScrollView>
            </ScrollView>
            <View style={styles.buttonContainer}>
                <Button style={{ borderRadius: 0 }} mode="outlined" onPress={pickImages}>Chọn ảnh</Button>
                {user.role === 0 && <Button style={{ borderRadius: 0 }} mode="outlined" onPress={() => navigation.navigate('CreateSurveyScreen', { surveyType, endTime, questions })}>Tạo khảo sát</Button>}
                <Button style={{ borderRadius: 0 }} mode="outlined" onPress={submitPost}>Đăng bài</Button>
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
        minHeight: 150,
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
});

export default CreatePostScreen;
