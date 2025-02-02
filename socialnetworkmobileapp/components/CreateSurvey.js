import React, { useState } from 'react';
import { View, TextInput, Button, Text, ScrollView, Switch, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

const surveyTypes = [
    { label: 'Training Program', value: 1 },
    { label: 'Recruitment Information', value: 2 },
    { label: 'Income', value: 3 },
    { label: 'Employment Situation', value: 4 },
];

const CreateSurvey = ({ navigation, route }) => {
    const [surveyType, setSurveyType] = useState(route.params?.surveyType || '');
    const [endTime, setEndTime] = useState(route.params?.endTime || new Date());
    const [questions, setQuestions] = useState(route.params?.questions || [{ question: '', options: [{ option: '' }], multi_choice: false }]);
    const [showDatePicker, setShowDatePicker] = useState(false);

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
        const newQuestions = questions.map((q, qIndex) => {
            if (qIndex === qIndex) {
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
        navigation.navigate('CreatePostScreen', { surveyType, endTime: endTime.toISOString(), questions });
    };

    return (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Picker
                selectedValue={surveyType}
                onValueChange={(itemValue) => setSurveyType(itemValue)}
                style={{ marginBottom: 16 }}
            >
                {surveyTypes.map((type) => (
                    <Picker.Item key={type.value} label={type.label} value={type.value} />
                ))}
            </Picker>
            <Button title="Select End Time" onPress={() => setShowDatePicker(true)} />
            {showDatePicker && (
                <DateTimePicker
                    value={endTime}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}
            <Text style={{ marginBottom: 16 }}>End Time: {endTime.toDateString()}</Text>
            {questions.map((question, qIndex) => (
                <View key={qIndex} style={{ marginBottom: 16 }}>
                    <TextInput
                        placeholder={`Question ${qIndex + 1}`}
                        value={question.question}
                        onChangeText={(text) => handleQuestionChange(text, qIndex)}
                        style={{ borderBottomWidth: 1, marginBottom: 8 }}
                    />
                    {question.options.map((option, oIndex) => (
                        <TextInput
                            key={oIndex}
                            placeholder={`Option ${oIndex + 1}`}
                            value={option.option}
                            onChangeText={(text) => handleOptionChange(text, qIndex, oIndex)}
                            style={{ borderBottomWidth: 1, marginBottom: 8 }}
                        />
                    ))}
                    <Button title="Add Option" onPress={() => handleAddOption(qIndex)} />
                    <View style={styles.switchContainer}>
                        <Text>Multi Choice</Text>
                        <Switch
                            value={question.multi_choice}
                            onValueChange={(value) => handleMultiChoiceChange(value, qIndex)}
                        />
                    </View>
                </View>
            ))}
            <Button title="Add Question" onPress={handleAddQuestion} />
            <Button title="Submit Survey" onPress={handleSubmitSurvey} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
});

export default CreateSurvey;