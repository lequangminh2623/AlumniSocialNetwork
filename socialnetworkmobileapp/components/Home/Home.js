import React from "react";
import { FlatList, StyleSheet } from "react-native";
import APIs, { endpoints } from "../../configs/APIs";
import { ActivityIndicator } from "react-native-paper";
import { PostItem } from "../PostItem";

const Home = () => {
    const [posts, setPosts] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(1);

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
                    setPage(0);
                }
            } catch (ex) {
                console.error(ex);
            } finally {
                setLoading(false);
            }
        }
    };

    React.useEffect(() => {
        loadPosts();
    }, [page]);

    const loadMore = () => {
        if (page > 0 && !loading) {
            setPage(page + 1);
        }
    };

    if (loading && page === 1) {
        return <ActivityIndicator size="large" />;
    }

    return (
        <FlatList
            data={posts}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listStyle}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <PostItem post={item} />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loading && page > 1 ? <ActivityIndicator size="large" /> : null}
        />
    );
};

export default Home;

const styles = StyleSheet.create({
    listStyle: {
        paddingBottom: 20,
    },
});