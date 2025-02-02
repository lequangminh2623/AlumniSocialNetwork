import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ScrollView, Alert, View, TextInput, Button, StyleSheet, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { endpoints } from '../configs/APIs';
import axios from '../configs/APIs';

const CreatePostScreen = ({ navigation, route }) => {
    const [content, setContent] = useState('');
    const [images, setImages] = useState([]);
    const [surveyType, setSurveyType] = useState('');
    const [endTime, setEndTime] = useState('');
    const [questions, setQuestions] = useState([{ question: '', options: [{ option: '' }] }]);

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

        const token = await getToken(); // Lấy token từ AsyncStorage

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
                <Button title="Chọn ảnh" onPress={pickImages} />
                <View style={styles.spacing} />
                <Button title="Tạo khảo sát" onPress={() => navigation.navigate('CreateSurveyScreen', { surveyType, endTime, questions })} />
                <View style={styles.spacing} />
                <Button title="Đăng bài" onPress={submitPost} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollView: {
        padding: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
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
        width: 100,
        height: 100,
        margin: 5,
        borderRadius: 8,
    },
    buttonContainer: {
        flexDirection: 'column',
        justifyContent: 'space-around',
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#ddd',
    },
    spacing: {
        height: 20,
    },
});

export default CreatePostScreen;
