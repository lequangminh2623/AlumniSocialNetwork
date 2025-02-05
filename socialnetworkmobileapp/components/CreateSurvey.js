import React, { useState } from 'react';
import { View, TextInput, Text, ScrollView, Switch, StyleSheet, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { IconButton, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const surveyTypes = [
    { label: 'Training Program', value: 1 },
    { label: 'Recruitment Information', value: 2 },
    { label: 'Income', value: 3 },
    { label: 'Employment Situation', value: 4 },
];

const CreateSurvey = ({ route }) => {
    const [surveyType, setSurveyType] = useState(route.params?.surveyType || 1);
    const [endTime, setEndTime] = useState(route.params?.endTime || new Date());
    const [questions, setQuestions] = useState(route.params?.questions || [{ question: '', options: [{ option: '' }], multi_choice: false }]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [hideInvitationButton, setHideInvitationButton] = useState(false);
    const navigation = useNavigation();

    const handleAddQuestion = () => {
        setQuestions([...questions, { question: '', options: [{ option: '' }], multi_choice: false }]);
    };

    const handleAddOption = (index) => {
        const newQuestions = questions.map((q, qIndex) => {
            if (qIndex === index) {
                return { ...q, options: [...q.options, { option: '' }] };
            }
            return q;
        });
        setQuestions(newQuestions);
    };

    const handleQuestionChange = (text, index) => {
        const newQuestions = questions.map((q, qIndex) => {
            if (qIndex === index) {
                return { ...q, question: text };
            }
            return q;
        });
        setQuestions(newQuestions);
    };

    const handleOptionChange = (text, qIndex, oIndex) => {
        const newQuestions = questions.map((q, questionIndex) => {
            if (questionIndex === qIndex) {
                const newOptions = q.options.map((o, optionIndex) => {
                    if (optionIndex === oIndex) {
                        return { option: text };
                    }
                    return o;
                });
                return { ...q, options: newOptions };
            }
            return q;
        });
        setQuestions(newQuestions);
    };
    

    const handleMultiChoiceChange = (value, index) => {
        const newQuestions = questions.map((q, qIndex) => {
            if (qIndex === index) {
                return { ...q, multi_choice: value };
            }
            return q;
        });
        setQuestions(newQuestions);
    };

    const handleDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || endTime;
        setShowDatePicker(false);
        setEndTime(currentDate);
    };

    const handleSubmitSurvey = () => {
        const isSurveyTypeValid = surveyType !== '';
        const isEndTimeValid = endTime instanceof Date && !isNaN(endTime);
        const areQuestionsValid = Array.isArray(questions) && questions.length > 0 && questions.every(q => q.question !== '' && Array.isArray(q.options) && q.options.length > 0);

        if (isSurveyTypeValid && isEndTimeValid && areQuestionsValid) {
            setHideInvitationButton(true);
            navigation.navigate('CreatePostScreen', { surveyType, endTime: endTime.toISOString(), questions, hideInvitationButton: true });
        } else {
            Alert.alert('Tạo khảo sát','Vui lòng điền đầy đủ thông tin.');
        }
    };

    const handleDeleteQuestion = (qIndex) => {
        const updatedQuestions = [...questions];
        updatedQuestions.splice(qIndex, 1);
        setQuestions(updatedQuestions);
      };
    
      const handleDeleteOption = (qIndex, oIndex) => {
        const updatedQuestions = [...questions];
        const updatedOptions = [...updatedQuestions[qIndex].options];
        updatedOptions.splice(oIndex, 1);
        updatedQuestions[qIndex].options = updatedOptions;
        setQuestions(updatedQuestions);
      };
    

    return (
        <ScrollView contentContainerStyle={{ padding: 16}}>
            <View style={styles.questionContainer}>
                <Picker
                    selectedValue={surveyType}
                    onValueChange={(itemValue) => setSurveyType(itemValue)}
                    style={{ marginBottom: 16,}}
                >
                    {surveyTypes.map((type) => (
                        <Picker.Item key={type.value} label={type.label} value={type.value} />
                    ))}
                </Picker>
                <View style={styles.datePickerContainer}>
                    <Text style={{ marginLeft: 15 }}>Thời hạn: {endTime.toDateString()}</Text>
                    <IconButton
                        icon="calendar"
                        size={24}
                        onPress={() => setShowDatePicker(true)}
                    />
                    {showDatePicker && (
                        <DateTimePicker
                            value={endTime}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                        />
                    )}
                </View>
            </View>
            {questions.map((question, qIndex) => (
                <View key={qIndex} style={styles.questionContainer}>
                <View style={styles.questionHeader}>
                    <TextInput
                    placeholder={`Question ${qIndex + 1}`}
                    value={question.question}
                    onChangeText={(text) => handleQuestionChange(text, qIndex)}
                    style={{ flex: 1, borderWidth: 1, borderRadius: 10, padding: 10 }}
                    />
                    {qIndex != 0 ? (<IconButton
                        icon="close"
                        iconColor='red'
                        mode='contained'
                        size={30}
                        onPress={() => handleDeleteQuestion(qIndex)}
                        style={styles.deleteButton}
                    />) : null}
                </View>
                {question.options.map((option, oIndex) => (
                    <View key={oIndex} style={styles.optionContainer}>
                        <TextInput
                            placeholder={`Option ${oIndex + 1}`}
                            value={option.option}
                            onChangeText={(text) => handleOptionChange(text, qIndex, oIndex)}
                            style={styles.optionInput}
                        />
                        {oIndex != 0 ? (<IconButton
                            icon="minus"
                            mode='outlined'
                            size={20}
                            onPress={() => handleDeleteOption(qIndex, oIndex)}
                            style={styles.deleteButton}
                        />) : null}
                    </View>
                ))}
                <IconButton
                        icon="plus"
                        mode='outlined'
                        size={20}
                        onPress={() => handleAddOption(qIndex)}
                        style={styles.addButton}
                    />
                <View style={styles.switchContainer}>
                    <Text>Multi Choice</Text>
                    <Switch
                    value={question.multi_choice}
                    onValueChange={(value) => handleMultiChoiceChange(value, qIndex)}
                    />
                </View>
                </View>
            ))}
            <IconButton
                icon="plus"
                iconColor='blue'
                mode='contained'
                size={30}
                onPress={handleAddQuestion}
                style={styles.addButton}
            />
            <Button mode="contained" style={{marginTop: 50}} onPress={handleSubmitSurvey}>Hoàn tất</Button>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
      padding: 16,
    },
    questionContainer: {
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      backgroundColor: '#ffffff',
      padding: 16,
    },
    questionHeader: { 
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    optionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    optionInput: {
      borderBottomWidth: 1,
      marginRight: 8,
      width: '80%',
    },
    deleteButton: {
        marginLeft: 10,
    },
    addButton: {
        alignSelf: 'center',
        marginVertical: 8,
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    datePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
  });

export default CreateSurvey;