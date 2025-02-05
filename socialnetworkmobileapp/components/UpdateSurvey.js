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

const UpdateSurvey  = ({ route }) => {
    const { post } = route.params
    const [surveyType, setSurveyType] = useState(route.params?.surveyType || 1);
    const [endTime, setEndTime] = useState(route.params?.endTime || new Date());
    const [questions, setQuestions] = useState(route.params?.questions || [{id: '', question: '', options: [{id: '', option: '' }], multi_choice: false }]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const navigation = useNavigation();

    const handleAddQuestion = () => {
        const newQuestion = {
          id: generateTempId(),
          question: '',
          options: [{ id: generateTempId(), option: '' }],
          multi_choice: false,
        };
        setQuestions([...questions, newQuestion]);
    };

    const handleAddOption = (questionId) => {
        const newQuestions = questions.map((q) => {
          if (q.id === questionId) {
            const newOption = { id: generateTempId(), option: '' };
            return { ...q, options: [...q.options, newOption] };
          }
          return q;
        });
        setQuestions(newQuestions);
    };
      

    const handleQuestionChange = (text, questionId) => {
        const newQuestions = questions.map((q) => {
          if (q.id === questionId) {
            return { ...q, question: text };
          }
          return q;
        });
        setQuestions(newQuestions);
      };

    const handleOptionChange = (text, questionId, optionId) => {
        const newQuestions = questions.map((q) => {
          if (q.id === questionId) {
            const newOptions = q.options.map((o) => {
              if (o.id === optionId) {
                return { ...o, option: text };
              }
              return o;
            });
            return { ...q, options: newOptions };
          }
          return q;
        });
        setQuestions(newQuestions);
      };

    const handleMultiChoiceChange = (value, questionId) => {
        const newQuestions = questions.map((q) => {
            if (q.id === questionId) {
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

        if (isSurveyTypeValid && isEndTimeValid && areQuestionsValid)
            navigation.navigate('UpdatePostScreen', { surveyType, endTime: endTime.toISOString(), questions, post, origin: "UpdateSurveyScreen" });
        else
            Alert.alert('Tạo khảo sát','Vui lòng điền đầy đủ thông tin.');
    };

    const handleDeleteQuestion = (questionId) => {
        const updatedQuestions = questions.filter((q) => q.id !== questionId);
        setQuestions(updatedQuestions);
    };
    
    const handleDeleteOption = (questionId, optionId) => {
        const newQuestions = questions.map((q) => {
            if (q.id === questionId) {
            const updatedOptions = q.options.filter((o) => o.id !== optionId);
            return { ...q, options: updatedOptions };
            }
            return q;
        });
        setQuestions(newQuestions);
    };

    const generateTempId = () => {
      return Math.floor(Date.now() + Math.random() * 1e6);
  };
    

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.questionContainer}>
            <Picker
                selectedValue={surveyType}
                onValueChange={(itemValue) => setSurveyType(itemValue)}
                style={{ marginBottom: 16 }}
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
        {questions.map((question) => (
            <View key={question.id} style={styles.questionContainer}>
                <View style={styles.questionHeader}>
                    <TextInput
                        placeholder="Question"
                        value={question.question}
                        onChangeText={(text) => handleQuestionChange(text, question.id)}
                        style={{ flex: 1, borderWidth: 1, borderRadius: 10, padding: 10 }}
                    />
                    {questions.length > 1 && (
                        <IconButton
                            icon="close"
                            iconColor="red"
                            mode="contained"
                            size={30}
                            onPress={() => handleDeleteQuestion(question.id)}
                            style={styles.deleteButton}
                        />
                    )}
                </View>
                {question.options.map((option) => (
                    <View key={option.id} style={styles.optionContainer}>
                        <TextInput
                            placeholder="Option"
                            value={option.option}
                            onChangeText={(text) => handleOptionChange(text, question.id, option.id)}
                            style={styles.optionInput}
                        />
                        {question.options.length > 2 && (
                            <IconButton
                                icon="minus"
                                mode="outlined"
                                size={20}
                                onPress={() => handleDeleteOption(question.id, option.id)}
                                style={styles.deleteButton}
                            />
                        )}
                    </View>
                ))}
                <IconButton
                    icon="plus"
                    mode="outlined"
                    size={20}
                    onPress={() => handleAddOption(question.id)}
                    style={styles.addButton}
                />
                <View style={styles.switchContainer}>
                    <Text>Multi Choice</Text>
                    <Switch
                        value={question.multi_choice}
                        onValueChange={(value) => handleMultiChoiceChange(value, question.id)}
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
        <Button mode="contained" style={{ marginTop: 50 }} onPress={handleSubmitSurvey}>Hoàn tất</Button>
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

export default UpdateSurvey