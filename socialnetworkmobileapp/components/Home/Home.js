import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import APIs, { endpoints } from "../../configs/APIs";
import { ActivityIndicator, Searchbar } from "react-native-paper";
import { PostItem } from "../PostItem";

const Home = () => {
    const [posts, setPosts] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [refreshing, setRefreshing] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [filteredPosts, setFilteredPosts] = React.useState([]);

    // Hàm load posts
    const loadPosts = async () => {
        if (page > 0) {
            setLoading(true);
            try {
                let url = `${endpoints['post']}?page=${page}`;
                let res = await APIs.get(url);
                console.info(res.data);

                if (page > 1) {
                    setPosts((posts) => [...posts, ...res.data.results]);
                } else {
                    setPosts(res.data.results);
                }

                if (res.data.next === null) {
                    setPage(0); // Không còn dữ liệu nữa
                }
            } catch (ex) {
                console.error(ex);
            } finally {
                setLoading(false);
            }
        }
        else 
            return
    };

    // Hàm để tải lại bài viết
    const refreshPosts = async () => {
        setRefreshing(true);
        setPage(1); // Reset lại trang về 1
        try {
            let res = await APIs.get(`${endpoints['post']}?page=1`);
            setPosts(res.data.results);
            setPage(2);
        } catch (ex) {
            console.error(ex);
        } finally {
            setRefreshing(false);
        }
    };

    // Gọi loadPosts mỗi khi page thay đổi
    React.useEffect(() => {
        loadPosts();
    }, [page]);

    // Gọi filterPosts mỗi khi searchQuery hoặc posts thay đổi
    React.useEffect(() => {
        filterPosts();
    }, [searchQuery, posts]);

    const loadMore = () => {
        if (page > 0 && !loading) {
            setPage(page + 1); // Khi tới cuối danh sách, load thêm bài viết
        }
    };

    const onChangeSearch = (query) => {
        setSearchQuery(query);
    };

    const filterPosts = () => {
        if (searchQuery) {
            const filtered = posts.filter(post => post.content.toLowerCase().includes(searchQuery.toLowerCase()));
            setFilteredPosts(filtered);
        } else {
            setFilteredPosts(posts);
        }
    };

    if (loading && page === 1) {
        return <ActivityIndicator size="large" />;
    }

    return (
        <View>
            <Searchbar
                placeholder="Search"
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={styles.searchBar}
            />
            <FlatList
                data={filteredPosts}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listStyle}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <PostItem post={item} />}
                onEndReached={loadMore}
                ListFooterComponent={loading && page > 1 ? <ActivityIndicator size="large" /> : null}
                refreshing={refreshing}
                onRefresh={refreshPosts}
            />
        </View>
    );
};

export default Home;

const styles = StyleSheet.create({
    listStyle: {
        paddingBottom: 20,
    },
    searchBar: {
        margin: 10,
    },
});
