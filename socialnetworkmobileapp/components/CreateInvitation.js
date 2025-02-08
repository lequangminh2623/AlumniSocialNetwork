import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { IconButton, Button, Checkbox, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { authApis, endpoints } from '../configs/APIs';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getValidImageUrl = (url) => {
    if (url.startsWith("image/upload/")) {
        return url.replace(/^image\/upload\//, "");
    }
    return url;
};

const CreateInvitation = () => {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [userList, setUserList] = useState([]);
    const [groupList, setGroupList] = useState([]);
    const [token, setToken] = useState(null);
    const [eventName, setEventName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [groupSearchQuery, setGroupSearchQuery] = useState('');
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
                const filteredUsers = response.data.results.filter(user => user.role === 1);
                setUserList(filteredUsers || []);
            } catch (error) {
                console.error('Lỗi khi lấy danh sách người dùng:', error);
            }
        };
        fetchUsers();
    }, [token]);

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

    const toggleUserSelection = (userId) => {
        setSelectedUsers((prevSelectedUsers) =>
            prevSelectedUsers.includes(userId)
                ? prevSelectedUsers.filter((id) => id !== userId)
                : [...prevSelectedUsers, userId]
        );
    };


    const toggleGroupSelection = (groupId) => {
        setSelectedGroups((prevSelectedGroups) =>
            prevSelectedGroups.includes(groupId)
                ? prevSelectedGroups.filter((id) => id !== groupId)
                : [...prevSelectedGroups, groupId]
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

    const filteredUserList = userList.filter(user =>
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredGroupList = groupList.filter(group =>
        group.group_name.toLowerCase().includes(groupSearchQuery.toLowerCase())
    );

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.select({ ios: 60, android: 0 })}
        >
            <View style={{ padding: 16 }}>
                <View>
                    <TextInput
                        placeholder="Tên sự kiện"
                        value={eventName}
                        onChangeText={setEventName}
                        style={styles.input}
                    />
                    <Text style={styles.label}>Chọn người dùng:</Text>
                    <View style={styles.searchContainer}>
                        <Searchbar
                            placeholder="Tìm kiếm người dùng"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.searchBar}
                        />
                        <Button mode="outlined" onPress={handleSelectAllUsers} style={styles.selectAllButton}>
                            Chọn tất cả
                        </Button>
                    </View>
                    <ScrollView style={styles.checkboxContainer}>
                        {filteredUserList.map((userItem) => (
                            <TouchableOpacity
                                key={userItem.id}
                                style={styles.checkboxItem}
                                onPress={() => toggleUserSelection(userItem.id)}
                            >
                                <Checkbox.Android
                                    status={selectedUsers.includes(userItem.id) ? 'checked' : 'unchecked'}
                                    onPress={() => toggleUserSelection(userItem.id)}
                                />
                                <Image
                                    source={{ uri: getValidImageUrl(userItem.avatar) }}
                                    style={styles.avatar}
                                />
                                <View style={styles.textContainer}>
                                    <Text style={styles.title}>{`${userItem.last_name} ${userItem.first_name}`}</Text>
                                    <Text style={styles.description}>{`Email: ${userItem.email}`}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <Text style={styles.label}>Chọn nhóm:</Text>
                    <View style={styles.searchContainer}>
                        <Searchbar
                            placeholder="Tìm kiếm nhóm"
                            value={groupSearchQuery}
                            onChangeText={setGroupSearchQuery}
                            style={styles.searchBar}
                        />
                        <Button mode="outlined" onPress={handleSelectAllGroups} style={styles.selectAllButton}>
                            Chọn tất cả
                        </Button>
                    </View>
                    <ScrollView style={styles.checkboxContainer}>
                        {filteredGroupList.map((groupItem) => (
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
                    </ScrollView>
                    <Button mode="contained" style={{ marginTop: 20 }} onPress={handleSubmitInvitation}>
                        Hoàn tất
                    </Button>
                </View>
            </View>
        </KeyboardAvoidingView>
    )
};

const styles = StyleSheet.create({
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    textContainer: {
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 35,
        marginRight: 16,
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
        borderRadius: 15,
        backgroundColor: '#fff'
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
    },
    checkboxContainer: {
        marginBottom: 20,
        maxHeight: '25%',
    },
    checkboxItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    searchBar: {
        flex: 1,
        marginRight: 10,
        height: 50,
    },
    selectAllButton: {
        marginTop: 0,
        marginBottom: 0,
    },
});

export default CreateInvitation;
