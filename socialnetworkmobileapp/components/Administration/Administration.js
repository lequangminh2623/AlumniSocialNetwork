import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Styles from '../../styles/Styles';

const Administration = ({ navigation }) => {
    return (
        <View style={Styles.menuContainer}>
            <View style={styles.view}>
                <Text style={styles.title}>CHỨC NĂNG QUẢN TRỊ</Text>
            </View>
            <TouchableOpacity
                style={Styles.menuItem}
                onPress={() => navigation.navigate('ApproveScreen')}>
                <Text style={Styles.menuText}>Duyệt tài khoản</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={Styles.menuItem}
                onPress={() => navigation.navigate('CreateAccountScreen')}>
                <Text style={Styles.menuText}>Tạo tài khoản giáo viên</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={Styles.menuItem}
                onPress={() => navigation.navigate('ResetTimerScreen')}>
                <Text style={Styles.menuText}>Đặt lại thời gian đổi mật khẩu</Text>
            </TouchableOpacity>
        </View>
    );
};

export default Administration;