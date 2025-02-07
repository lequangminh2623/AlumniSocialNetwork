import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, FlatList, ActivityIndicator, Alert, Image, RefreshControl, StyleSheet } from 'react-native';
import { Text, Checkbox, Button, Searchbar } from 'react-native-paper';
import { authApis, endpoints } from '../../configs/APIs';
import { getValidImageUrl } from '../PostItem';

const ResetTimer = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState([]);


  const loadTeachers = async () => {
    if (page > 0) {
      try {
        setLoading(true);
        let url = `${endpoints['expired-teacher']}?page=${page}`;
        if (searchQuery) url += `&search=${searchQuery}`;
        const token = await AsyncStorage.getItem('token');
        let res = await authApis(token).get(url);
        if (page > 1) {
          setTeachers((prev) => [...prev, ...res.data.results]);
        } else {
          setTeachers(res.data.results);
        }
        if (res.data.next === null) setPage(0);
      } catch (error) {
        console.error(error);
        Alert.alert('Lỗi', 'Không thể tải danh sách giáo viên.');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let timer = setTimeout(() => loadTeachers(), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, page]);

  const loadMore = () => {
    if (page > 0 && !loading) setPage(page + 1);
  };

  const search = (value, callback) => {
    setPage(1);
    callback(value);
  };

  const refresh = () => {
    setPage(1);
    loadTeachers();
  };


  const toggleSelectTeacher = (id) => {
    setSelectedTeachers((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((teacherId) => teacherId !== id)
        : [...prevSelected, id]
    );
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
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      await authApis(token).post(endpoints['reset-teacher-bulk'], {
        pks: selectedTeachers,
      });
      setTeachers((prevTeacher) =>
        prevTeacher.filter((teachers) => !selectedTeachers.includes(teachers.id))
      );
      setSelectedTeachers([]);
      Alert.alert('Thành công', 'Đã đặt lại mật khẩu cho các giáo viên được chọn.');
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
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
      <Searchbar
        placeholder="Tìm kiếm giáo viên"
        value={searchQuery}
        onChangeText={t => search(t, setSearchQuery)}
      />
      <View style={styles.buttonContainer}>
        <Button onPress={selectAll} style={styles.selectAllButton}>
          {selectedTeachers.length === teachers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </Button>
        <Button
          mode="contained"
          onPress={confirmBulkReset}
          disabled={selectedTeachers.length === 0 || loading}
          style={styles.bulkButton}
        >
          Đặt lại mật khẩu
        </Button>
      </View>
      {teachers.length === 0 && !loading ? (
        <Text style={styles.emptyText}>Không có kết quả tìm kiếm nào</Text>
      ) : (
        <>
          <FlatList
            data={teachers}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refresh} />
            }
          />
          {loading && <ActivityIndicator />}
        </>
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
    fontSize: 18
  },
});
