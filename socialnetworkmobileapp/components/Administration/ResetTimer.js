import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, FlatList, ActivityIndicator, Alert, StyleSheet, Image } from 'react-native';
import { Text, Checkbox, Button, Searchbar } from 'react-native-paper';
import { authApis, endpoints } from '../../configs/APIs';
import { getValidImageUrl } from '../PostItem';

const ResetTimer = () => {
    const [loading, setLoading] = useState(true);
    const [teachers, setTeachers] = useState([]);
    const [token, setToken] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedTeachers, setSelectedTeachers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const onChangeSearch = (query) => {
        setSearchQuery(query);
        setPage(1);
        setTeachers([]);
        setHasMore(true);
        setLoading(true);
    };

    const toggleSelectTeacher = (id) => {
        setSelectedTeachers((prevSelected) =>
            prevSelected.includes(id)
                ? prevSelected.filter((teacherId) => teacherId !== id)
                : [...prevSelected, id]
        );
    };

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
                    params: { page, search: searchQuery },
                });
                if (page === 1) {
                    setTeachers(response.data.results);
                } else {
                    setTeachers((prev) => [...prev, ...response.data.results]);
                }
                setHasMore(response.data.next !== null);
            } catch (error) {
                console.error(error);
                Alert.alert('Lỗi', 'Không thể tải danh sách giáo viên.');
            } finally {
                setLoading(false);
            }
        };

        fetchExpiredPasswordTeachers();
    }, [token, page, searchQuery]);

    const confirmBulkReset = () => {
        Alert.alert(
            'Xác nhận',
            `Bạn có chắc chắn muốn đặt lại thời gian cho ${selectedTeachers.length} giáo viên đã chọn?`,
            [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Đồng ý', onPress: handleBulkReset },
            ]
        );
    };

    const handleBulkReset = async () => {
        setActionLoading(true);
        try {
            await authApis(token).patch(endpoints['reset-teacher-bulk'], { pks: selectedTeachers });
            setTeachers((prevTeachers) =>
                prevTeachers.filter((teacher) => !selectedTeachers.includes(teacher.id))
            );
            setSelectedTeachers([]);
            Alert.alert('Thành công', 'Đã đặt lại thời gian cho các giáo viên được chọn.');
        } catch (error) {
            console.error(error);
            Alert.alert('Lỗi', 'Không thể đặt lại thời gian. Vui lòng thử lại.');
        } finally {
            setActionLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.listItem}>
            <Checkbox
                status={selectedTeachers.includes(item.id) ? 'checked' : 'unchecked'}
                onPress={() => toggleSelectTeacher(item.id)}
            />
            <Image
                source={{ uri: getValidImageUrl(item.user.avatar) }}
                style={styles.avatar}
            />
            <View style={styles.textContainer}>
                <Text style={styles.title}>{`${item.user.last_name} ${item.user.first_name}`}</Text>
                <Text style={styles.description}>{`Email: ${item.user.email}`}</Text>
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
            <Searchbar
                placeholder="Tìm kiếm giáo viên..."
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={styles.searchBar}
            />
            <Button
                mode="contained"
                onPress={confirmBulkReset}
                disabled={selectedTeachers.length === 0}
                style={styles.bulkResetButton}
            >
                Đặt lại thời gian cho đã chọn
            </Button>
            <FlatList
                data={teachers}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                ListEmptyComponent={<Text>Không có giáo viên nào hết hạn đổi mật khẩu.</Text>}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={hasMore && <ActivityIndicator size="large" color="#0000ff" />}
            />
        </View>
    );
};

export default ResetTimer;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    listItem: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
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
        marginBottom: 2,
    },
    bulkResetButton: {
        marginBottom: 16,
    },
    searchBar: {
        marginBottom: 16,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
