import React, { useState, useEffect, useCallback } from "react";
import { FlatList, StyleSheet, View, Text } from "react-native";
import APIs, { endpoints } from "../../configs/APIs";
import { ActivityIndicator, Searchbar } from "react-native-paper";
import { PostItem } from "../PostItem";

const Home = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [hasMore, setHasMore] = useState(true);

    // Hàm load posts
    const loadPosts = useCallback(async () => {
        if (!hasMore) return; // Ngăn tải thêm khi không còn dữ liệu

        setLoading(true);
        try {
            let url = `${endpoints['post']}?page=${page}`;
            if (searchQuery) url += `&q=${searchQuery}`;

            let res = await APIs.get(url);
            setPosts(prev => (page > 1 ? [...prev, ...res.data.results] : res.data.results));

            if (res.data.next === null) 
                setHasMore(false); // Đánh dấu không còn dữ liệu
        } catch (ex) {
            console.error(ex);
        } finally {
            setLoading(false);
        }
    }, [page, searchQuery, hasMore]);

    // Gọi API khi thay đổi page hoặc searchQuery
    useEffect(() => {
        let timer = setTimeout(loadPosts, 500);
        return () => clearTimeout(timer);
    }, [page, searchQuery]);

    // Hàm tải lại danh sách bài viết
    const refreshPosts = useCallback(async () => {
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
        try {
            let res = await APIs.get(`${endpoints['post']}?page=1&q=${searchQuery}`);
            setPosts(res.data.results);
        } catch (ex) {
            console.error(ex);
        } finally {
            setRefreshing(false);
        }
    }, [searchQuery]);

    // Hàm thay đổi tìm kiếm
    const onChangeSearch = useCallback((query) => {
        setSearchQuery(query);
        setPage(1);
        setHasMore(true);
    }, []);

    // Load thêm dữ liệu khi cuộn đến cuối
    const loadMore = () => {
        if (hasMore && !loading) 
            setPage(prev => prev + 1);
    };

    return (
        <View>
            <Searchbar
                placeholder="Tìm kiếm bài viết..."
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={styles.searchBar}
            />
            {posts.length === 0 && !loading ? (
                <Text style={styles.noPostsText}>Không có kết quả tìm kiếm nào</Text>
            ) : (
                <FlatList
                    data={posts}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listStyle}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => <PostItem post={item} />}
                    onEndReached={loadMore}
                    ListFooterComponent={loading && page > 1 ? <ActivityIndicator size="large" /> : null}
                    refreshing={refreshing}
                    onRefresh={refreshPosts}
                />
            )}
        </View>
    );
};

export default Home;

const styles = StyleSheet.create({
    listStyle: {
        paddingBottom: 100,
        
    },
    searchBar: {
        margin: 10,
    },
    noPostsText: {
        textAlign: "center",
        marginTop: 20,
        fontSize: 16,
        color: "gray",
    },
});