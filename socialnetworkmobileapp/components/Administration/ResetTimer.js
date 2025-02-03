import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, FlatList, ActivityIndicator, Alert, StyleSheet, Image } from 'react-native';
import { Text, IconButton, List } from 'react-native-paper';
import { authApis, endpoints } from '../../configs/APIs';
import { getValidImageUrl } from '../PostItem';
import Styles from '../../styles/Styles';

const ResetTimer = () => {
    const [loading, setLoading] = useState(true);
    const [teachers, setTeachers] = useState([]);
    const [token, setToken] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        const fetchToken = async () => {
            const storedToken = await AsyncStorage.getItem("token");
            setToken(storedToken);
        };

        fetchToken();
    }, []);

    useEffect(() => {
        const fetchExpiredPasswordTeachers = async () => {
            if (!token) return;
            try {
                const response = await authApis(token).get(endpoints['expired-teacher'], {
                    params: { page }
                });
                setTeachers(prev => [...prev, ...response.data.results]);
                console.info(response.data.results);
                setHasMore(response.data.next !== null);
            } catch (error) {
                Alert.alert("Lỗi", "Không thể tải danh sách giáo viên có mật khẩu hết hạn.");
            } finally {
                setLoading(false);
            }
        };

        fetchExpiredPasswordTeachers();
    }, [token, page]);

    const handleReset = async (id) => {
        setActionLoading(true);
        try {
            await authApis(token).patch(endpoints['reset-teacher'](id));
            setTeachers(teachers.filter(teacher => teacher.id !== id));
            Alert.alert("Đặt lại thời gian", "Thời gian đổi mật khẩu của giáo viên đã được đặt lại.");
        } catch (error) {
            console.error(error);
            Alert.alert("Đặt lại thời gian", "Không thể đặt lại thời gian đổi mật khẩu. Vui lòng thử lại.");
        } finally {
            setActionLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.listItem}>
            <Image
                source={{ uri: getValidImageUrl(item.user.avatar) }}
                style={styles.avatar}
            />
            <View style={styles.textContainer}>
                <Text style={styles.title}>{`${item.user.last_name} ${item.user.first_name}`}</Text>
                <Text style={styles.description}>{`Email: ${item.user.email}`}</Text>
            </View>
            <View style={styles.actionButtons}>
                <IconButton
                    icon="refresh"
                    color="blue"
                    size={20}
                    onPress={() => handleReset(item.id)}
                    disabled={actionLoading}
                    style={styles.iconButton}
                />
                <IconButton
                    icon="delete"
                    color="red"
                    size={20}
                    onPress={() => handleDelete(item.id)}
                    disabled={actionLoading}
                    style={styles.iconButton}
                />
            </View>
        </View>
    );

    const loadMore = () => {
        if (hasMore && !loading) {
            setPage(prevPage => prevPage + 1);
        }
    };

    if (loading && page === 1) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {actionLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            )}
            <FlatList
                data={teachers}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                ListEmptyComponent={<Text>Không có giáo viên nào hết hạn đổi mật khẩu.</Text>}
                onEndReached={loadMore}
                ListFooterComponent={hasMore && <ActivityIndicator size="large" color="#0000ff" />}
            />
        </View>
    );
};

export default ResetTimer;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8', // Consistent background color
        paddingHorizontal: 16, // Add horizontal padding to the container
        paddingTop: 16,       // Add top padding to the container
    },
    listItem: {
        padding: 16, // Consistent padding for list items
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20, // Slightly less rounded corners
        marginBottom: 16, // Space between list items
        elevation: 2,       // Add a subtle shadow (Android)
        shadowColor: '#000', // Add a subtle shadow (iOS)
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatar: {
        width: 60,  // Slightly larger avatar
        height: 60,
        borderRadius: 30, // Make it circular
        marginRight: 16,
    },
    textContainer: {
        flex: 1, // Allow text to take available space
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2, // Space between description lines
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        marginHorizontal: 4,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});