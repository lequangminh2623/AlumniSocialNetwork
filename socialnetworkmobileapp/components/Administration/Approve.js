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

  const fetchToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
    } catch (error) {
      console.error('Failed to fetch token:', error);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

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

  useEffect(() => {
    fetchExpiredPasswordTeachers();
  }, [token, page, searchQuery]);

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  const selectAll = () => {
    if (selectedTeachers.length === teachers.length) {
      setSelectedTeachers([]);
    } else {
      setSelectedTeachers(teachers.map((teacher) => teacher.id));
    }
  };

  const confirmBulkReset = () => {
    Alert.alert(
      'Xác nhận',
      `Bạn có chắc chắn muốn đặt lại mật khẩu cho ${selectedTeachers.length} giáo viên đã chọn?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đồng ý', onPress: handleBulkReset },
      ]
    );
  };

  const handleBulkReset = async () => {
    setActionLoading(true);
    try {
      await authApis(token).post(endpoints['reset-password-teacher-bulk'], {
        pks: selectedTeachers,
      });
      setSelectedTeachers([]);
      Alert.alert('Thành công', 'Đã đặt lại mật khẩu cho các giáo viên được chọn.');
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
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

  return (
    <View style={styles.container}>
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
      <Searchbar
        placeholder="Tìm kiếm giáo viên"
        onChangeText={onChangeSearch}
        value={searchQuery}
      />
      <View style={styles.buttonContainer}>
        <Button onPress={selectAll} style={styles.selectAllButton}>
          {selectedTeachers.length === teachers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </Button>
        <Button
          mode="contained"
          onPress={confirmBulkReset}
          disabled={selectedTeachers.length === 0}
          style={styles.bulkButton}
        >
          Đặt lại mật khẩu
        </Button>
      </View>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
      {!loading && (
        <FlatList
          data={teachers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Không có giáo viên nào.</Text>
          }
          ListFooterComponent={
            hasMore && (
              <ActivityIndicator size="large" color="#0000ff" />
            )
          }
        />
      )}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 35,
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
  buttonContainer: {
    flexDirection: 'row',
    margin: 10,
    justifyContent: 'space-between',
  },
  selectAllButton: {
    flex: 1,
    marginRight: 5,
  },
  bulkButton: {
    flex: 1,
    marginLeft: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});
