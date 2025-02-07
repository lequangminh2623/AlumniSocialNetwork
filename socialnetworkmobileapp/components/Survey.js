import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, Alert } from 'react-native';
import { Button, Checkbox, RadioButton } from 'react-native-paper';
import { authApis, endpoints, getSurveyData } from "../configs/APIs";
import { getValidImageUrl } from "./PostItem";
import moment from "moment";
import 'moment/locale/vi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

moment.locale("vi");

const surveyTypes = {
    1: 'Training Program',
    2: 'Recruitment Information',
    3: 'Income',
    4: 'Employment Situation',
};

const Survey = ({ route }) => {
    const { post } = route.params;
    const [survey, setSurvey] = useState({});
    const [selectedOptions, setSelectedOptions] = useState({});
    const [token, setToken] = useState(null);
    const [hasCompleted, setHasCompleted] = useState(false)
    const navigation = useNavigation()

    useEffect(() => {
        const fetchToken = async () => {
            const storedToken = await AsyncStorage.getItem("token");
            setToken(storedToken);
        };

        fetchToken();
    }, []);

    useEffect(() => {
        const fetchSurvey = async () => {
            const surveyData = await getSurveyData(post.id);
            setSurvey(surveyData);
        };

        const fetchDraft = async () => {
            try {
                const response = await authApis(token).get(endpoints['resume'](post.id));
                if (response.status === 200) {
                    setHasCompleted(response.data.has_completed)
                    if (response.data.answers){
                        const draftAnswers = response.data.answers;
                        
                        const formattedAnswers = draftAnswers.reduce((acc, answer) => {
                            acc[answer.question_id] = answer.selected_options;
                            return acc;
                        }, {});
                        setSelectedOptions(formattedAnswers);
                    }
                }
            } catch (error) {
                console.error('Error fetching draft:', error);
            }
        };

        fetchSurvey();
        if(token)
            fetchDraft();
    }, [post.id, token]);

    const handleCheckboxChange = (questionId, optionId) => {
        setSelectedOptions((prevState) => {
            const questionOptions = prevState[questionId] || [];
            if (questionOptions.includes(optionId)) {
                return {
                    ...prevState,
                    [questionId]: questionOptions.filter((id) => id !== optionId),
                };
            } else {
                return {
                    ...prevState,
                    [questionId]: [...questionOptions, optionId],
                };
            }
        });
    };

    const handleRadioButtonChange = (questionId, optionId) => {
        setSelectedOptions((prevState) => ({
            ...prevState,
            [questionId]: [optionId],
        }));
    };

    const handleSaveDraft = async () => {
        try {
            const response = await authApis(token).post(endpoints['draft'](post.id), {
                answers: selectedOptions,
            });
            if (response.status === 201 || response.status === 200) {
                Alert.alert('Kháo sát' ,'Khảo sát được lưu nháp thành công!');
                navigation.navigate("HomeStack", {screen: "HomeScreen"})
            } else {
                Alert.alert('Khảo sát' ,'Bạn không có quyền lưu nháp khảo sát này hoặc đã hồi đáp trước đó.');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            Alert.alert('Khảo sát', 'Xảy ra lỗi trong quá trình lưu nháp.');
        }
    };

    const handleSubmit = async () => {
        const unansweredQuestions = survey.questions.filter(
            (question) => !selectedOptions[question.id] || selectedOptions[question.id].length === 0
        );

        if (unansweredQuestions.length > 0) {
            Alert.alert('Khảo sát', 'Vui lòng trả lời tất cả các câu hỏi.');
            return;
        }

        try {
            const response = await authApis(token).post(endpoints['submit'](post.id), {
                answers: selectedOptions,
            });
            if (response.status === 201) {
                Alert.alert('Kháo sát' ,'Khảo sát được gửi thành công!');
                navigation.navigate("HomeStack", {screen: "HomeScreen"})
            } else {
                Alert.alert('Khảo sát' ,'Bạn không có quyền trả lời khảo sát này hoặc đã hồi đáp trước đó.');
            }
        } catch (error) {
            console.error('Error submitting survey:', error);
            Alert.alert('Khảo sát', 'Xảy ra lỗi trong quá trình lưu nháp.');
        }
    };

    

    const renderQuestion = (question) => (
        <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionText}>{question.question}</Text>
            {question.options && question.options.map((option) => (
                <View key={option.id} style={styles.optionContainer}>
                    {question.multi_choice ? (
                        <Checkbox
                            status={selectedOptions[question.id]?.includes(option.id) ? 'checked' : 'unchecked'}
                            onPress={() => handleCheckboxChange(question.id, option.id)}
                        />
                    ) : (
                        <RadioButton
                            value={option.id}
                            status={selectedOptions[question.id]?.includes(option.id) ? 'checked' : 'unchecked'}
                            onPress={() => handleRadioButtonChange(question.id, option.id)}
                        />
                    )}
                    <Text style={styles.optionText}>{option.option}</Text>
                </View>
            ))}
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {hasCompleted ? (
                <Text style={styles.completedText}>Bạn đã hoàn thành khảo sát này.</Text>
            ) : (
                <>
                <View style={styles.postContainer}>
                    <View style={styles.post}>
                        <Image source={{ uri: post.user.avatar.replace(/^image\/upload\//, "") }} style={styles.avatar} />
                        <View>
                            <Text style={styles.username}>{post.user.username}</Text>
                            <Text style={styles.postTime}>{moment(post.created_date).fromNow()}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                            <Text style={styles.surveyType}>Loại khảo sát: {surveyTypes[survey.survey_type]}</Text>
                            <Text style={styles.endTime}>Hạn chót: {moment(survey.end_time).format('LLL')}</Text>
                        </View>
                    </View>
                    <Text style={styles.content}>{post.content}</Text>
                    {post.images && post.images.length > 0 && (
                        <View style={styles.imagesContainer}>
                            {post.images.map((image, index) => (
                                <Image
                                    key={index}
                                    source={{ uri: getValidImageUrl(image.image) }}
                                    style={styles.postImage}
                                />
                            ))}
                        </View>
                    )}
                </View>
                {survey.questions && survey.questions.map(renderQuestion)}
                <View style={styles.buttonContainer}>
                    <Button mode="contained" onPress={handleSaveDraft} style={styles.button}>
                        Lưu nháp
                    </Button>
                    <Button mode="contained" onPress={handleSubmit} style={styles.button}>
                        Gửi
                    </Button>
                </View>
                </>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    questionContainer: {
        marginTop: 16,
        backgroundColor: '#ffffff',
        width: '100%',
        padding: 16,
        borderRadius: 8,
    },
    postContainer: {
        marginBottom: 16,
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 8,
    },
    questionText: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    optionText: {
        marginLeft: 8,
    },
    post: { 
        flexDirection: "row", 
        alignItems: "center", 
        marginBottom: 10 
    },
    avatar: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        marginRight: 10 
    },
    username: { 
        fontSize: 16, 
        fontWeight: "bold" 
    },
    postTime: { 
        fontSize: 12, 
        color: "#888" 
    },
    content: {
        fontSize: 14, 
        margin: 10 
    },
    postImage: { 
        width: "100%", 
        height: 200, 
        borderRadius: 10 
    },
    surveyType: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    endTime: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    button: {
        width: '30%',
        margin: 16,
    },
    completedText: {
        fontFamily: 'Roboto',
        fontSize: 20,
        fontWeight: '400',
        fontStyle: 'italic',
        color: '#666',
        lineHeight: 24,
        textAlign: 'center',
        marginHorizontal: 16,
      },
});

export default Survey;