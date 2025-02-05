import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { IconButton, Button, Checkbox } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { authApis, endpoints } from '../configs/APIs'; // Đảm bảo import đúng API endpoint
import AsyncStorage from '@react-native-async-storage/async-storage';

const CreateInvitation = ({ route }) => {
    const [selectedUsers, setSelectedUsers] = useState([]); // Lưu danh sách người dùng đã chọn
    const [selectedGroups, setSelectedGroups] = useState([]); // Lưu danh sách nhóm đã chọn
    const [group, setGroup] = useState(route.params?.group || 0);
    const [userList, setUserList] = useState([]);
    const [groupList, setGroupList] = useState([]);
    const [token, setToken] = useState(null);
    const [eventName, setEventName] = useState('');
    const navigation = useNavigation();

    useEffect(() => {
        const fetchToken = async () => {
            const storedToken = await AsyncStorage.getItem('token');
            setToken(storedToken);
        };
        fetchToken();
    }, []);

    // Lấy danh sách người dùng
    useEffect(() => {
        const fetchUsers = async () => {
            if (!token) return;
            try {
                const response = await authApis(token).get(endpoints['all-users']);
                setUserList(response.data || []);
            } catch (error) {
                console.error('Lỗi khi lấy danh sách người dùng:', error);
            }
        };
        fetchUsers();
    }, [token]);

    // Lấy danh sách nhóm
    useEffect(() => {
        const fetchGroups = async () => {
            if (!token) return;
            try {
                const response = await authApis(token).get(endpoints['group']);
                setGroupList(response.data.results || []);
            } catch (error) {
                console.error('Lỗi khi lấy danh sách nhóm:', error);
            }
        };
        fetchGroups();
    }, [token]);

    // Xử lý chọn/bỏ chọn người dùng
    const toggleUserSelection = (userId) => {
        setSelectedUsers((prevSelectedUsers) =>
            prevSelectedUsers.includes(userId)
                ? prevSelectedUsers.filter((id) => id !== userId) // Bỏ chọn nếu đã chọn
                : [...prevSelectedUsers, userId] // Thêm vào danh sách nếu chưa chọn
        );
    };

    // Xử lý chọn/bỏ chọn nhóm
    const toggleGroupSelection = (groupId) => {
        setSelectedGroups((prevSelectedGroups) =>
            prevSelectedGroups.includes(groupId)
                ? prevSelectedGroups.filter((id) => id !== groupId) // Bỏ chọn nếu đã chọn
                : [...prevSelectedGroups, groupId] // Thêm vào danh sách nếu chưa chọn
        );
    };

    const handleSelectAllUsers = () => {
        if (selectedUsers.length === userList.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(userList.map(user => user.id));
        }
    };

    const handleSelectAllGroups = () => {
        if (selectedGroups.length === groupList.length) {
            setSelectedGroups([]);
        } else {
            setSelectedGroups(groupList.map(group => group.id));
        }
    };

    const handleSubmitInvitation = () => {
        const isEventNameValid = eventName.trim() !== '';
        console.log(selectedUsers, selectedGroups, eventName);
        if ((selectedUsers.length > 0 || selectedGroups.length > 0) && isEventNameValid) {
            navigation.navigate('CreatePostScreen', {
                selectedUsers,
                selectedGroups,
                eventName,
                hideSurveyButton: true,
            });
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
                <Text style={styles.label}>Chọn người dùng:</Text>
                <Button mode="outlined" onPress={handleSelectAllUsers} style={styles.selectAllButton}>
                    Chọn tất cả
                </Button>
                <View style={styles.checkboxContainer}>
                    {userList.map((userItem) => (
                        <TouchableOpacity
                            key={userItem.id}
                            style={styles.checkboxItem}
                            onPress={() => toggleUserSelection(userItem.id)}
                        >
                            <Checkbox.Android
                                status={selectedUsers.includes(userItem.id) ? 'checked' : 'unchecked'}
                                onPress={() => toggleUserSelection(userItem.id)}
                            />
                            <Text>{userItem.username}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.label}>Chọn nhóm:</Text>
                <Button mode="outlined" onPress={handleSelectAllGroups} style={styles.selectAllButton}>
                    Chọn tất cả
                </Button>
                <View style={styles.checkboxContainer}>
                    {groupList.map((groupItem) => (
                        <TouchableOpacity
                            key={groupItem.id}
                            style={styles.checkboxItem}
                            onPress={() => toggleGroupSelection(groupItem.id)}
                        >
                            <Checkbox.Android
                                status={selectedGroups.includes(groupItem.id) ? 'checked' : 'unchecked'}
                                onPress={() => toggleGroupSelection(groupItem.id)}
                            />
                            <Text>{groupItem.group_name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Button mode="contained" style={{ marginTop: 20 }} onPress={handleSubmitInvitation}>
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
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
    },
    checkboxContainer: {
        marginBottom: 20,
    },
    checkboxItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    selectAllButton: {
        marginTop: 10,
        marginBottom: 10,
    },
});

export default CreateInvitation;
