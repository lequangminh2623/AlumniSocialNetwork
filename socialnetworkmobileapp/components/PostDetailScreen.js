import React, { useEffect, useState } from "react";
import { View, Text, Image, FlatList, StyleSheet, TouchableOpacity, TextInput, Button, KeyboardAvoidingView, Platform } from "react-native";
import { getPostComments, authApis, endpoints } from "../configs/APIs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import 'moment/locale/vi';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Icon, IconButton } from "react-native-paper";

moment.locale("vi");

const getValidImageUrl = (url) => {
    if (url.startsWith("image/upload/")) {
        return url.replace(/^image\/upload\//, "");
    }
    return url;
};

const selectImage = async (setImage) => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
    }
};

const PostDetailScreen = ({ navigation, route }) => {
    const { post, onCommentAdded } = route.params;
    const [comments, setComments] = useState([]);
    const [commentContent, setCommentContent] = useState(null);
    const [replyContent, setReplyContent] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [commentImage, setCommentImage] = useState(null);
    const [replyImage, setReplyImage] = useState(null);
    const cleanAvatarUrlAvatar = post.user.avatar.replace(/^image\/upload\//, "");

    const buildCommentTree = (comments) => {
        if (!Array.isArray(comments)) return [];
        let commentMap = new Map();
        let rootComments = [];
        
        comments.forEach(comment => {
            comment.replies = [];
            commentMap.set(comment.id, comment);
        });
        
        comments.forEach(comment => {
            if (comment.parent) {
                commentMap.get(comment.parent)?.replies.push(comment);
            } else {
                rootComments.push(comment);
            }
        });
        
        return rootComments;
    };
    
    const CommentItem = ({ comment, onReply }) => {
        return (
            <View style={styles.comment}>
                <Image source={{ uri: cleanAvatarUrlAvatar }} style={styles.commentAvatar} />
                <View>
                    <View style={styles.commentHeader}>
                        <Text style={styles.commentUser}>{comment.user.username}</Text>
                        <Text style={styles.commentTime}>{moment(comment.created_date).fromNow()}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.content}</Text>
                    {comment.image && (
                        <Image source={{ uri: getValidImageUrl(comment.image) }} style={styles.commentImage} />
                    )}
                    <TouchableOpacity onPress={() => setReplyingTo(comment.id)}>
                        <Text style={styles.replyButton}>Trả lời</Text>
                    </TouchableOpacity>

                    {replyingTo === comment.id && (
                        <View>
                            <View style={styles.replyContainer}>
                                <TextInput
                                    style={styles.replyInput}
                                    value={replyContent}
                                    onChangeText={setReplyContent}
                                    placeholder="Viết bình luận..."
                                    multiline
                                />

                                <TouchableOpacity onPress={() => selectImage(setReplyImage)}>
                                    <Ionicons name="image-outline" size={24} color="blue" />
                                </TouchableOpacity>
                                <IconButton icon="send" iconColor="#007BFF" size={30} onPress={() => handleReply(comment.id)} />

                            </View>
                            {replyImage && (
                                <View style={styles.selectedImageContainer}>
                                    <Image source={{ uri: replyImage }} style={styles.selectedImage} />
                                    <TouchableOpacity onPress={() => setReplyImage(null)}>
                                        <Ionicons name="close-circle" size={24} color="red" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                    {comment.replies?.length > 0 && (
                        <View style={styles.repliesContainer}>
                            {comment.replies.map(reply => (
                                <CommentItem key={reply.id} comment={reply} onReply={onReply} />
                            ))}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    useEffect(() => {
        const fetchComments = async () => {
            const data = await getPostComments(post.id);
            setComments(buildCommentTree(data));
        };

        fetchComments();
    }, [post.id]);

    const handleComment = async () => {
        try {
            if (!commentContent) return;
            const token = await AsyncStorage.getItem("token");
            const api = authApis(token);

            const formData = new FormData();
            formData.append('content', commentContent);
            if (commentImage) {
                formData.append('image', {
                    uri: commentImage,
                    type: 'image/jpeg',
                    name: 'comment-image.jpg',
                });
            }

            await api.post(`/post/${post.id}/comment/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setCommentContent("");
            setCommentImage(null);
            const data = await getPostComments(post.id);
            setComments(buildCommentTree(data));
            if (onCommentAdded) {
                onCommentAdded();
            }
        } catch (error) {
            console.error("Error commenting on post:", error);
        }
    };

    const handleReply = async (commentId) => {
        try {
            if (!replyContent) return;
            const token = await AsyncStorage.getItem("token");
            const api = authApis(token);

            const formData = new FormData();
            formData.append('content', replyContent);
            if (replyImage) {
                formData.append('image', {
                    uri: replyImage,
                    type: 'image/jpeg',
                    name: 'reply-image.jpg',
                });
            }

            await api.post(`/comment/${commentId}/reply/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setReplyContent("");
            setReplyImage(null);
            setReplyingTo(null);
            const data = await getPostComments(post.id);
            setComments(data);

            if (onCommentAdded) {
                onCommentAdded();
            }
        } catch (error) {
            console.error("Error replying to comment:", error);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <FlatList
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 30 }}
                data={comments}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={
                    <View>
                        <View style={styles.post}>
                            <Image source={{ uri: cleanAvatarUrlAvatar }} style={styles.avatar} />
                            <View>
                                <Text style={styles.username}>{post.user.username}</Text>
                                <Text style={styles.postTime}>{moment(post.created_date).fromNow()}</Text>
                            </View>
                            {post.object_type === "survey" && (
                                <TouchableOpacity onPress={() => navigation.navigate('SurveyScreen', { post: post })} style={{ flex: 1, alignItems: "flex-end" }}>
                                    <Text style={styles.surveyButton}>Tiến hành khảo sát</Text>
                                </TouchableOpacity>
                            )}
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
                        <Text style={styles.commentTitle}>Bình luận</Text>
                        <View style={styles.commentInputContainer}>
                            <TextInput
                                style={styles.commentInput}
                                value={commentContent}
                                onChangeText={setCommentContent}
                                placeholder="Viết bình luận..."
                                multiline
                            />

                            <TouchableOpacity onPress={() => selectImage(setCommentImage)}>
                                <Ionicons name="image-outline" size={24} color="blue" />
                            </TouchableOpacity>
                            <IconButton icon="send" iconColor="#007BFF" size={30} onPress={handleComment} />
                        </View>
                        {commentImage && (
                            <View style={styles.selectedImageContainer}>
                                <Image source={{ uri: commentImage }} style={styles.selectedImage} />
                                <TouchableOpacity onPress={() => setCommentImage(null)}>
                                    <Ionicons name="close-circle" size={24} color="red" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                }
                extraData={comments}
                renderItem={({ item }) => <CommentItem comment={item} onReply={setReplyingTo} />}
            />
        </KeyboardAvoidingView>
    );
};

export const styles = StyleSheet.create({
    commentContainer: { flexDirection: "row", marginTop: 10 },
    container: {
        padding: 16,
        backgroundColor: "#fff",
        flex: 1
    },
    post: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10
    },
    username: {
        fontSize: 16,
        fontWeight: "bold"
    },
    postTime: {
        fontSize: 12,
        color: "#888"
    },
    content: {
        fontSize: 14,
        marginBottom: 10
    },
    postImage: {
        width: "100%",
        height: 200,
        borderRadius: 10
    },
    commentTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 20
    },
    comment: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginTop: 10
    },
    commentHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    commentAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10
    },
    commentUser: {
        fontWeight: "bold",
        marginRight: 10,
    },
    commentText: {
        fontSize: 14
    },
    imagesContainer: {
        flexDirection: "column",
        gap: 10,
        marginTop: 10,
    },
    postImage: {
        width: "100%",
        height: 200,
        borderRadius: 10,
        marginBottom: 10,
    },
    commentTime: {
        fontSize: 12,
        color: "#888",
        marginTop: 5,
    },
    replyButton: {
        color: "#007BFF",
        marginTop: 5,
    },
    replyContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
    },
    replyInput: {
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        marginRight: 10,
        minHeight: 10,
        minWidth: 250,
        flex: 1,
    },
    commentInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
    },
    commentInput: {
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        marginRight: 10,
        minHeight: 40,
        flex: 1,
    },
    surveyButton: {
        color: '#007BFF',
    },
    commentImage: {
        width: 100,
        height: 100,
        borderRadius: 10,
        marginTop: 10,
    },
    selectedImageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    selectedImage: {
        width: 50,
        height: 50,
        borderRadius: 10,
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: '#007BFF',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default PostDetailScreen;