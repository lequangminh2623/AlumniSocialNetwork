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
    const [hideSurveyButton, setHideSurveyButton] = useState(false);
    const [hideInvitationButton, setHideInvitationButton] = useState(false);
    const [userList, setUserList] = useState([]);
    const [groupList, setGroupList] = useState([]);
    const [eventName, setEventName] = useState("");
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (route.params?.surveyType) setSurveyType(route.params.surveyType);
        if (route.params?.endTime) setEndTime(new Date(route.params.endTime));
        if (route.params?.questions) setQuestions(route.params.questions);
        if (route.params?.hideSurveyButton) setHideSurveyButton(route.params.hideSurveyButton);
        if (route.params?.hideInvitationButton) setHideInvitationButton(route.params.hideInvitationButton);
        
        if (route.params?.selectedUsers) setUserList(route.params.selectedUsers);
        if (route.params?.selectedGroups) setGroupList(route.params.selectedGroups);
        if (route.params?.eventName) setEventName(route.params.eventName);
    }, [route.params]);

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
            Alert.alert("Đăng bài", "Vui lòng nhập nội dung bài viết.");
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
        
        const isUserListValid = userList !== 0;
        const isGroupListValid = groupList !== 0;
        const isEventNameValid = eventName.trim() !== '';

        if (isSurveyTypeValid && isEndTimeValid && areQuestionsValid) {

            formData.append('survey_type', surveyType);
            formData.append('end_time', endTime.toISOString());
            formData.append('questions', JSON.stringify(questions));
            try {
                setLoading(true)
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
            } finally {
                setLoading(false)
            }
        }
        else if ((isUserListValid || isGroupListValid) && isEventNameValid) {
            userList.forEach((user, index) => {
                formData.append('users', user);
            });
            groupList.forEach((group, index) => {
                formData.append('groups', group);
            });
            formData.append('event_name', eventName);
            try {
                setLoading(true)
                const response = await axios.post(endpoints['invitation'], formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`,
                    },
                });
    
                if (response.status === 201) {
                    Alert.alert('Gửi lời mời thành công!');
                    navigation.navigate('HomeStack', { screen: 'HomeScreen' });
                } else {
                    Alert.alert('Gửi lời mời không thành công');
                }
            } catch (error) {
                console.error("Error submitting invitation:", error);
                Alert.alert('Đã xảy ra lỗi. Vui lòng thử lại.');
            } finally{
                setLoading(false)
            }
        } else {
            try {
                setLoading(true)
                const response = await axios.post(endpoints.post, formData, {
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
            } finally {
                setLoading(false)
            }
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <View style={styles.post}>
                    <Image source={{ uri: user.avatar.replace(/^image\/upload\//, "") }} style={styles.avatar} />
                    <View>
                        {user.role === 0 ? (
                            <Text style={styles.username}>Quản Trị Viên</Text>
                    ) : (
                    <Text style={styles.username}>{user.first_name} {user.last_name}</Text>)}
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
                {!hideSurveyButton && user.role === 0 && (
                    <Button style={styles.createSurveyButton} mode="outlined" onPress={() => navigation.navigate('CreateSurveyScreen', { surveyType, endTime, questions })}>Tạo khảo sát</Button>
                )}
                {user.role === 0 && !hideInvitationButton && (
                    <Button style={styles.createInvitationButton} mode="outlined" onPress={() => navigation.navigate('CreateInvitationScreen', { userList, groupList, eventName })}>Tạo thư mời</Button>
                )}
                <Button style={styles.submitButton} loading={loading} mode="contained" onPress={submitPost}>Đăng bài</Button>
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
        fontWeight: "bold",
        marginStart: 5,
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
