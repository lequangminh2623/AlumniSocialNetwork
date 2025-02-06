import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useContext } from 'react';
import { MyUserContext } from "../configs/UserContexts";
import { ScrollView, Alert, View, TextInput, StyleSheet, Image, Text } from 'react-native';
import { Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { endpoints, getSurveyData } from '../configs/APIs';
import axios from '../configs/APIs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';


const UpdatePost = ({ route }) => {
    const { post } = route.params;
    const user = useContext(MyUserContext);
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState('');
    const [images, setImages] = useState([]);
    const [surveyType, setSurveyType] = useState('');
    const [endTime, setEndTime] = useState('');
    const [questions, setQuestions] = useState([{id: '', question: '', options: [{id: '', option: '' }], multi_choice: false }]);

    useEffect(() => {
        if (route.params?.surveyType) setSurveyType(route.params.surveyType);
        if (route.params?.endTime) setEndTime(new Date(route.params.endTime));
        if (route.params?.questions) setQuestions(route.params.questions);
        if (route.params?.post) {
            setContent(post.content);
            setImages(
                post.images.map(img => {
                    if (img.uri) return img;
                    return {
                      uri: img.image.replace(/^image\/upload\//, ''),
                      id: img.id,
                    };
                })
            )
            if (post.object_type === "survey" && route.params.origin === "HomeScreen") {
                const fetchSurvey = async () => {
                    const surveyData = await getSurveyData(post.id);
                    setSurveyType(surveyData.survey_type);
                    setEndTime(new Date(surveyData.end_time));
                    setQuestions(surveyData.questions);
                };
                fetchSurvey();
            }
        }
    }, [route.params]);

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 1,
        });

        if (!result.canceled) {
            const newImages = images.concat(result.assets);
            setImages(newImages);
        }
    };

    const deleteImage = (index) => {
        setImages(images.filter((_, i) => i !== index));
    };

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

    const submitPost = async () => {
        if(loading) return
        if (!content) {
            Alert.alert("Cập nhật bài viết", "Vui lòng nhập nội dung bài viết.");
            return;
        }

        const token = await getToken();

        const formData = new FormData();
        formData.append('content', content);

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
            try {
                setLoading(true);
                const response = await axios.put(endpoints['survey-detail'](post.id), formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (response.status === 200) {
                    Alert.alert('Đăng bài thành công!');
                    navigation.navigate('HomeStack', { screen: 'HomeScreen' });
                } else {
                    Alert.alert('Đăng bài không thành công');
                }
            } catch (error) {
                console.error("Error submitting post:", error);
                Alert.alert('Đã xảy ra lỗi. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        }
        else
            try {
                setLoading(true);
                const response = await axios.put(endpoints['post-detail'](post.id), formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.status === 200) {
                    Alert.alert('Đăng bài thành công!');
                    navigation.navigate('HomeStack', { screen: 'HomeScreen' });
                } else {
                    Alert.alert('Đăng bài không thành công');
                }
            } catch (error) {
                console.error("Error submitting post:", error);
                Alert.alert('Đã xảy ra lỗi. Vui lòng thử lại.');
            } finally {
                setLoading(false);
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
                        { post.object_type === 'survey' && <Button style={styles.createSurveyButton} mode="outlined" onPress={() => navigation.navigate('UpdateSurveyScreen', { surveyType, endTime, questions, post })}>Chỉnh sửa khảo sát</Button>}
                        { post.object_type === 'invitation' && <Button style={styles.createInvitationButton} mode="outlined">Chỉnh sửa thư mời</Button>}
                    </>
                )}
                <Button style={styles.submitButton} loading={loading} mode="contained" onPress={submitPost}>Cập nhật bài viết</Button>
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

export default UpdatePost;