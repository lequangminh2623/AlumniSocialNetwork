import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { IconButton, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { authApis, endpoints } from '../configs/APIs'; // Đảm bảo import đúng API endpoint
import AsyncStorage from '@react-native-async-storage/async-storage';

const CreateInvitation = ({ route }) => {
    const [user, setUser] = useState(route.params?.user || 0);
    const [group, setGroup] = useState(route.params?.group || 0);
    const [userList, setUserList] = useState([]);  // Danh sách người dùng từ API
    const [groupList, setGroupList] = useState([]);  // Danh sách nhóm từ API
    const navigation = useNavigation();
    const [token, setToken] = useState(null);
    const [hideSurveyButton, setHideSurveyButton] = useState(false);
    const [eventName, setEventName] = useState(''); // Add state for event_name

    useEffect(() => {
        const fetchToken = async () => {
            const storedToken = await AsyncStorage.getItem("token");
            setToken(storedToken);
        };

        fetchToken();
    }, []);

    // Lấy danh sách người dùng từ API
    useEffect(() => {
        const fetchUsers = async () => {
            if (!token) return;
            try {
                const response = await authApis(token).get(endpoints['all-users']);
                const userList = Array.isArray(response.data) ? response.data : [];
                setUserList(userList);  // Cập nhật userList với dữ liệu API
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };
        fetchUsers();
    }, [token]);

    // Lấy danh sách nhóm từ API
    useEffect(() => {
        const fetchGroups = async () => {
            if (!token) return;
            try {
                const response = await authApis(token).get(endpoints['group']);
                const groupList = Array.isArray(response.data.results) ? response.data.results : [];
                setGroupList(groupList);  // Cập nhật groupList với dữ liệu API
            } catch (error) {
                console.error('Error fetching groups:', error);
            }
        };
        fetchGroups();
    }, [token]);

    const handleUserChange = (value) => {
        setUser(value);
    };

    const handleGroupChange = (value) => {
        setGroup(value);
    };

    const handleSubmitInvitation = () => {
        const isUserValid = user !== 0;
        const isGroupValid = group !== 0;
        const isEventNameValid = eventName.trim() !== '';
        console.info(user, group, eventName); // Include eventName in the log
        if ((isUserValid || isGroupValid) && isEventNameValid) {
            setHideSurveyButton(true);
            navigation.navigate('CreatePostScreen', {
                user, 
                group,
                eventName, 
                hideSurveyButton: true });
        } else {
            Alert.alert('Tạo lời mời', 'Vui lòng nhập đầy đủ thông tin.');
        }
    };

    return (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={styles.container}>
                <TextInput
                    placeholder="Tên sự kiện"
                    value={eventName}
                    onChangeText={setEventName}
                    style={styles.input}
                />
                <View style={styles.userContainer}>
                    <Picker
                        selectedValue={user}
                        onValueChange={handleUserChange}
                        style={{ flex: 1 }}
                    >
                        {user === 0 && <Picker.Item label="Chọn người dùng" value={0} />}
                        {userList.map((userItem, index) => (
                            <Picker.Item key={index} label={userItem.username} value={userItem.id} />
                        ))}
                    </Picker>
                </View>
                <View style={styles.userContainer}>
                    <Picker
                        selectedValue={group}
                        onValueChange={handleGroupChange}
                        style={{ flex: 1 }}
                    >
                        {group === 0 && <Picker.Item label="Chọn nhóm" value={0} />}
                        {groupList.map((groupItem, index) => (
                            <Picker.Item key={index} label={groupItem.group_name} value={groupItem.id} />
                        ))}
                    </Picker>
                </View>
                <Button mode="contained" style={{ marginTop: 50 }} onPress={handleSubmitInvitation}>
                    Hoàn tất
                </Button>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    userContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    deleteButton: {
        marginLeft: 10,
    },
    addButton: {
        alignSelf: 'center',
        marginVertical: 8,
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 12,
        paddingHorizontal: 8,
    },
});

export default CreateInvitation;
