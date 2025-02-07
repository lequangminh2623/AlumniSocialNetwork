import React, { useState, useEffect, useContext } from 'react';
import {View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, TextInput, Image } from 'react-native';
import { endpoints, authApis } from '../../configs/APIs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MyUserContext } from '../../configs/UserContexts';
import { getValidImageUrl } from '../PostItem';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Searchbar } from 'react-native-paper';

const UsersList = ({ navigation }) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(true);

    const currentUser = useContext(MyUserContext);

    const fetchUsers = async (pageNumber = 1, refreshing = false) => {
        try {
            if (refreshing) {
                setIsRefreshing(true);
            } else {
                setLoading(true);
            }

            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found');
                return;
            }

            const res = await authApis(token).get(endpoints['all-users'], {
                params: {
                    page: pageNumber
                },
            });

            let allUsers = res.data.results || res.data;

            // Loại bỏ người dùng hiện tại khỏi danh sách
            if (currentUser) {
                allUsers = allUsers.filter(
                    user => user.id !== currentUser.id.toString()
                );
            }

            if (pageNumber === 1 || refreshing) {
                setUsers(allUsers);
            } else {
                setUsers(prevUsers => [...prevUsers, ...allUsers]);
            }

            // Kiểm tra xem có thêm trang nữa không
            if (res.data.next) {
                setHasNextPage(true);
            } else {
                setHasNextPage(false);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            if (refreshing) {
                setIsRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (currentUser) {
            setPage(1);
            fetchUsers(1, true);
        }
    }, [currentUser]);

    useEffect(() => {
        const filtered = users.filter(user =>
            (user.first_name + ' ' + user.last_name)
                .toLowerCase()
                .includes(searchText.toLowerCase())
        );
        setFilteredUsers(filtered);
    }, [searchText, users]);

    useEffect(() => {
        if (!currentUser || users.length === 0) return;
    
        const q = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', currentUser.id.toString())
        );
    
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const chatsData = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            chatsData.push({
              chatId: doc.id,
              participants: data.participants,
              lastMessage: data.lastMessage || '',
              updatedAt: data.updatedAt?.toDate(),
            });
          });
    
          // Tạo mapping từ ID người dùng đến tin nhắn cuối cùng
          const lastMessagesMap = {};
          chatsData.forEach((chat) => {
            const otherUserId = chat.participants.find(
              (id) => id !== currentUser.id.toString()
            );
            lastMessagesMap[otherUserId] = chat.lastMessage;
          });
    
          // Cập nhật danh sách người dùng với tin nhắn cuối cùng
          const updatedUsers = users.map((user) => ({
            ...user,
            lastMessage: lastMessagesMap[user.id.toString()] || '',
          }));
    
          // Lọc danh sách người dùng dựa trên từ khóa tìm kiếm
          const filtered = updatedUsers.filter((user) =>
            (user.first_name + ' ' + user.last_name).toLowerCase().includes(searchText.toLowerCase())
          );
    
          setFilteredUsers(filtered);
        });
    
        return () => unsubscribe();
      }, [currentUser, users, searchText]);

    const handleChat = recipient => {
        navigation.navigate('ChatScreen', { recipient });
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => handleChat(item)}
        >
            <Image
                source={{
                    uri:
                        getValidImageUrl(item.avatar)
                }}
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                {item.role === 0 ? (
                    <Text style={styles.username}>Quản Trị Viên</Text>
                ) : (
                    <Text style={styles.username}>
                        {item.first_name} {item.last_name}
                    </Text>
                )}
                <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage || 'Không có tin nhắn trước đó.'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading && page === 1) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Searchbar
                    style={styles.searchInput}
                    placeholder="Tìm kiếm..."
                    value={searchText}
                    onChangeText={text => setSearchText(text)}
                />
            </View>
            {filteredUsers.length === 0 && (
                <View style={styles.container}>
                    <Text style={{fontStyle: "italic", fontSize: 18, alignSelf: 'center'}}>Không có người dùng nào.</Text>
                </View>
            )}
            <FlatList
                data={filteredUsers}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                onEndReached={() => {
                    if (hasNextPage && !loading) {
                        const nextPage = page + 1;
                        setPage(nextPage);
                        fetchUsers(nextPage);
                    }
                }}
                onEndReachedThreshold={0.5}
                refreshing={isRefreshing}
                onRefresh={() => {
                    setPage(1);
                    fetchUsers(1, true);
                }}
                ListFooterComponent={
                    loading && page > 1 ? (
                        <ActivityIndicator size="small" color="#0000ff" />
                    ) : null
                }
            />
        </View>
    );

};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        backgroundColor: '#ffffff',
    },
    searchContainer: {
        paddingVertical: 8,
    },
    searchInput: {
        paddingHorizontal: 16,
        backgroundColor: '#eeee',
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#ffffff',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 16, // Giảm kích thước font
        fontWeight: '500', // Độ đậm vừa phải
        color: '#333', // Màu chữ đậm hơn
    },
    lastMessage: {
        fontSize: 14,
        color: '#888', // Màu xám nhạt
    },
});


export default UsersList;
