import React, { useState, useEffect, useCallback, useContext } from 'react';
import { GiftedChat } from 'react-native-gifted-chat';
import { collection, doc, setDoc, addDoc, getDocs, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { getValidImageUrl } from '../PostItem';
import { db } from '../../firebaseConfig';

import { MyUserContext } from '../../configs/UserContexts';

const Chat = ({ route }) => {
    const [messages, setMessages] = useState([]);
    const { recipient } = route.params;

    const user = useContext(MyUserContext);

    useEffect(() => {
        if (!user) return;

        const userIdStr = user.id.toString();
        const recipientIdStr = recipient.id.toString();

        const participants = [userIdStr, recipientIdStr];
        participants.sort();

        const chatId = participants.join('-');

        const messagesQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(messagesQuery, querySnapshot => {
            const allMessages = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    _id: data._id,
                    text: data.text,
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                    user: data.user,
                };
            });
            setMessages(allMessages);
        });

        return () => unsubscribe();
    }, [user]);


    const onSend = useCallback(async (messages = []) => {
        if (!user) return;

        const msg = messages[0];

        const userIdStr = user.id.toString();
        const recipientIdStr = recipient.id.toString();

        const participants = [userIdStr, recipientIdStr];
        participants.sort();

        const chatId = participants.join('-');

        const messageData = {
            _id: msg._id,
            text: msg.text,
            createdAt: serverTimestamp(),
            user: {
                _id: userIdStr,
                name: user.username,
                avatar: getValidImageUrl(user.avatar),
            },
        };

        await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

        await setDoc(doc(db, 'chats', chatId), {
            participants: participants,
            lastMessage: msg.text,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    }, [user, recipient]);


    return (
        <GiftedChat
            messages={messages}
            onSend={messages => onSend(messages)}
            user={{
                _id: user.id.toString(),
                name: user.username,
                avatar: user.avatar,
            }}
        />
    );
};

export default Chat;
