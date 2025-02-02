import React, { useContext, useReducer } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Button, Icon } from 'react-native-paper';
import Home from './components/Home/Home';
import Register from './components/User/Register';
import Login from './components/User/Login';
import ChangePassword from './components/User/ChangePassword';
import UserProfile from './components/User/UserProfile';
import Approve from './components/Administration/Approve';
import CreateAccount from './components/Administration/CreateAccount';
import PostDetailScreen from './components/PostDetailScreen';
import { MyDispatchContext, MyUserContext } from './configs/UserContexts';
import MyUserReducer from './configs/UserReducers';
import Administration from './components/Administration/Administration';
import ResetTimer from './components/Administration/ResetTimer';
import CreatePostScreen from './components/CreatePostScreen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CreateSurvey from './components/CreateSurvey';

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();
const HomeStackNavigator = () => {
    const navigation = useNavigation();

    return (
        <Stack.Navigator>
            <Stack.Screen
                name="HomeScreen"
                component={Home}
                options={{
                    title: 'Bài viết',
                    headerRight: () => (
                        <Button
                            icon="plus-circle-outline"
                            mode="text"
                            onPress={() => navigation.navigate('HomeStack', { screen: 'CreatePostScreen' })}
                            labelStyle={{ color: 'black' }}
                        >
                            Tạo bài viết
                        </Button>
                    )
                }}
            />
            <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreatePostScreen" component={CreatePostScreen} options={{ headerShown: false, title: 'Tạo bài viết' }} />
            <Stack.Screen name="CreateSurveyScreen" component={CreateSurvey} options={{ headerShown: false, title: 'Tạo khảo sát' }}/>
        </Stack.Navigator>
    );
};


const AdminStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="AdministrationScreen" component={Administration} options={{ title: 'Quản trị' }} />
            <Stack.Screen name="ApproveScreen" component={Approve} options={{ title: 'Duyệt tài khoản' }} />
            <Stack.Screen name="CreateAccountScreen" component={CreateAccount} options={{ title: 'Tạo tài khoản giáo viên' }} />
            <Stack.Screen name="ResetTimerScreen" component={ResetTimer} options={{ title: 'Đặt lại thời gian đổi mật khẩu' }} />
        </Stack.Navigator>
    );
};
const ProfileStackNavigator = () => (
    <Stack.Navigator>
        <Stack.Screen name="UserProfileScreen" component={UserProfile} options={{ headerShown: false, title: 'Tài khoản' }} />
        <Stack.Screen name="ChangePasswordScreen" component={ChangePassword} options={{ headerShow: false, title: 'Đổi mật khẩu' }} />
    </Stack.Navigator>
);

const TabNavigator = () => {
    const user = useContext(MyUserContext);

    return (
        <Tab.Navigator>
            {user === null ? (
                <>
                    <Tab.Screen name="RegisterScreen" component={Register} options={{ title: 'Đăng ký', tabBarIcon: ({ color, size }) => <Icon name="account-plus" color={color} size={size} /> }} />
                    <Tab.Screen name="LoginScreen" component={Login} options={{ title: 'Đăng nhập', tabBarIcon: ({ color, size }) => <Icon name="login" color={color} size={size} /> }} />
                </>
            ) : (
                <>
                    <Tab.Screen name="HomeStack" component={HomeStackNavigator} options={{ title: 'Màn hình chính', tabBarIcon: ({ color, size }) => <Icon name="home" color={color} size={size} /> }} />
                    <Tab.Screen name="ProfileStack" component={ProfileStackNavigator} options={{ title: 'Tài khoản', tabBarIcon: ({ color, size }) => <Icon name="account" color={color} size={size} /> }} />
                    {user.role === 0 && (
                        <Tab.Screen name="AdminStack" component={AdminStackNavigator} options={{ title: 'Quản trị', tabBarIcon: ({ color, size }) => <Icon name="account-check" color={color} size={size} /> }} />
                    )}
                </>
            )}
        </Tab.Navigator>
    );
}

export default function App() {
    const [user, dispatch] = useReducer(MyUserReducer, null);

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <NavigationContainer>
                <MyUserContext.Provider value={user}>
                    <MyDispatchContext.Provider value={dispatch}>
                        <TabNavigator />
                    </MyDispatchContext.Provider>
                </MyUserContext.Provider>
            </NavigationContainer>
        </SafeAreaView>
    );
}