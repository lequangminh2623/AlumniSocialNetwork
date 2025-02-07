import React, { useEffect, useState, useContext } from "react";
import { Image, StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import { hp } from "../styles/common";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getPostComments, getPostReacts, authApis, endpoints } from "../configs/APIs";
import { theme } from "../styles/theme";
import { MyUserContext } from "../configs/UserContexts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import 'moment/locale/vi';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from "react-native-paper";



moment.locale("vi");
export const getValidImageUrl = (url) => {
    if (url.startsWith("image/upload/")) {
        return url.replace(/^image\/upload\//, "");
    }
    return url;
};

export const PostItem = ({ post, onPostDeleted, onPostUpdated }) => {
    const cleanAvatarUrlAvatar = post.user.avatar.replace(/^image\/upload\//, "");
    const navigation = useNavigation();
    const user = useContext(MyUserContext);

    const [commentCount, setCommentCount] = useState(0);
    const [reactCount, setReactCount] = useState(0);
    const [likeCount, setLikeCount] = useState(0);
    const [hahaCount, setHahaCount] = useState(0);
    const [loveCount, setLoveCount] = useState(0);

    const [selectedReaction, setSelectedReaction] = useState(null);
    const [showReactions, setShowReactions] = useState(false);

    const fetchPostData = async () => {
        const comments = await getPostComments(post.id);
        setCommentCount(comments.length);

        const reacts = await getPostReacts(post.id);
        setReactCount(reacts.length);

        const userReact = reacts.find((react) => react.user.id === user.id);
        setSelectedReaction(userReact ? userReact.reaction : null);

        setLikeCount(reacts.filter(react => react.reaction === 1).length);
        setHahaCount(reacts.filter(react => react.reaction === 2).length);
        setLoveCount(reacts.filter(react => react.reaction === 3).length);
    };

    useEffect(() => {
        fetchPostData();
    }, [post.id]);

    const reactions = [
        { id: 1, name: "LIKE", icon: "thumbs-up", color: "#1877F2" },
        { id: 2, name: "HAHA", icon: "smile-o", color: "#FFD700" },
        { id: 3, name: "LOVE", icon: "heart", color: "#FF3040" },
    ];

    const handleReact = async (reactionId) => {
        try {
            const token = await AsyncStorage.getItem("token");
            const api = authApis(token);
            await api.post(endpoints.react(post.id), { reaction: reactionId });

            await fetchPostData();
            setShowReactions(false);
        } catch (error) {
            console.error("Error reacting to post:", error);
        }
    };

    const handleRemoveReact = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            const api = authApis(token);

            await api.post(endpoints.react(post.id));

            await fetchPostData();
            setShowReactions(false);
        } catch (error) {
            console.error("Error removing reaction:", error);
        }
    };

    const updateCommentCount = (commentCount) => {
        setCommentCount(commentCount);
    };


    return (
        <View style={styles.container}>
            <View style={styles.userInfo}>
                <Image source={{ uri: cleanAvatarUrlAvatar }} style={styles.avatar} />
                <View>
                    {post.user.first_name || post.user.last_name ? (
                        <Text style={styles.username}>{post.user.first_name} {post.user.last_name}</Text>
                    ) : (<Text style={styles.username}>Quản Trị Viên</Text>)}
                    <Text style={styles.postTime}>{moment(post.created_date).fromNow()}</Text>
                </View>
                <View style={{ flexDirection: "row", flex: 1 }}>
                    <View style={{ flexDirection: "row" }}>
                        {(user.role === 0 || user.id === post.user.id) && (
                            <IconButton
                                icon="delete"
                                color="red"
                                size={20}
                                onPress={() => onPostDeleted(post.id)}
                                style={{ marginRight: -10 }}
                            />
                        )}
                        {(user.id === post.user.id) && (
                            <IconButton
                                icon="lead-pencil"
                                color="red"
                                size={20}
                                onPress={() => onPostUpdated(post.id)}
                            />
                        )}
                    </View>

                    <View style={{ flexDirection: 'column', marginLeft: 'auto' }}>
                        <FontAwesome name="ellipsis-h" size={hp(2.4)} color={theme.colors.text} style={styles.moreIcon} onPress={() => navigation.navigate("PostDetailScreen", { postId: post.id, onCommentAdded: updateCommentCount })} />
                        {post.object_type === "survey" && (
                            <TouchableOpacity onPress={() => navigation.navigate('SurveyScreen', { post: post })} style={{ flex: 1, alignItems: "flex-end" }}>
                                <Text style={{ color: '#007BFF' }}>Tiến hành khảo sát</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            <Text style={styles.content}>{post.content}</Text>

            {post.images && post.images.length > 0 && (
                <View style={styles.imagesContainer}>
                    {post.images.map((image, index) => (
                        <Image
                            key={index}
                            source={{ uri: getValidImageUrl(image.image) }}
                            style={styles.postImage}
                        />
                    ))}
                </View>
            )}
            <View style={styles.reactionCounts}>
                <View style={styles.reactionCountItem}>
                    <FontAwesome name="thumbs-up" size={18} color="#1877F2" />
                    <Text style={styles.reactionCountText}>{likeCount}</Text>
                </View>
                <View style={styles.reactionCountItem}>
                    <FontAwesome name="smile-o" size={18} color="#FFD700" />
                    <Text style={styles.reactionCountText}>{hahaCount}</Text>
                </View>
                <View style={styles.reactionCountItem}>
                    <FontAwesome name="heart" size={18} color="#FF3040" />
                    <Text style={styles.reactionCountText}>{loveCount}</Text>
                </View>
            </View>
            <View style={styles.interactions}>
                <TouchableOpacity onPress={() => setShowReactions(!showReactions)}>
                    <FontAwesome
                        name={reactions.find((r) => r.id === selectedReaction)?.icon || "thumbs-up"}
                        size={18}
                        color={reactions.find((r) => r.id === selectedReaction)?.color || "#888"}
                    />
                </TouchableOpacity>
                <Text style={styles.interactionText}>{reactCount}</Text>

                {showReactions && (
                    <View style={styles.reactionMenu}>
                        {reactions.map((reaction) => (
                            <TouchableOpacity
                                key={reaction.id}
                                onPress={() => handleReact(reaction.id)}
                                style={styles.reactionButton}
                            >
                                <FontAwesome name={reaction.icon} size={20} color={reaction.color} />
                            </TouchableOpacity>
                        ))}

                        {selectedReaction && (
                            <TouchableOpacity onPress={handleRemoveReact} style={styles.reactionButton}>
                                <Ionicons name="close-circle" size={20} color="red" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                <FontAwesome name="comment" size={18} color="#888" onPress={() => navigation.navigate("PostDetailScreen", { postId: post.id, onCommentAdded: updateCommentCount })} />
                <Text style={styles.interactionText}>{commentCount}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    interactionText: {
        marginLeft: 4,
        marginRight: 15,
        fontSize: 14,
        color: "#555",
    },
    imagesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 10,
    },
    interactions: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        paddingVertical: 5,
        borderTopWidth: 1,
        borderColor: "#eee",
    },
    postImage: {
        width: "48%",
        height: 200,
        borderRadius: 10,
        marginBottom: 10,
    },
    moreIcon: {
        marginLeft: "auto",
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    content: {
        gap: 10,
    },
    postTime: {
        fontSize: hp(1.4),
        color: theme.colors.textLight,
        fontWeight: theme.fonts.medium,
    },
    username: {
        fontSize: hp(1.7),
        color: theme.colors.textDark,
        fontWeight: theme.fonts.medium,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    container: {
        gap: 10,
        marginBottom: 10,
        marginTop: 10,
        borderRadius: theme.radius.xxl * 1.1,
        borderCurve: 'continuous',
        padding: 10,
        paddingVertical: 12,
        marginHorizontal: 10,
        backgroundColor: 'white',
        borderWidth: 0.5,
        borderColor: theme.colors.gray,
        shadowColor: '#000',
    },
    reactionMenu: {
        flexDirection: "row",
        position: "absolute",
        top: 30,
        backgroundColor: "white",
        padding: 5,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        elevation: 5,
        zIndex: 1,
    },
    reactionButton: {
        marginHorizontal: 5,
    },
    reactionCounts: {
        flexDirection: "row",
        justifyContent: "flex-start",
        marginTop: 10,
    },
    reactionCountItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 10,
    },
    reactionCountText: {
        fontSize: 14,
        color: "#555",
        marginLeft: 5,
    }
})