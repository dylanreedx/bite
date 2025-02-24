// components/Themed.tsx
import {
  Text as DefaultText,
  View as DefaultView,
  TextInput as DefaultTextInput,
  SafeAreaView as DefaultSafeAreaView,
  Button as DefaultButton,
  StyleProp,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import colors from '@/constants/colors';
import {useColorScheme} from './useColorScheme';
import {Pressable} from 'react-native-gesture-handler';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];
export type TextInputProps = ThemeProps & DefaultTextInput['props'];

export function useThemeColor(
  props: {light?: string; dark?: string},
  colorName: keyof typeof colors.light
) {
  const theme = useColorScheme() ?? 'light';
  return props[theme] ?? colors[theme][colorName];
}

export function Text(props: TextProps) {
  const {style, lightColor, darkColor, ...otherProps} = props;
  const color = useThemeColor({light: lightColor, dark: darkColor}, 'text');
  return <DefaultText style={[{color}, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const {style, lightColor, darkColor, ...otherProps} = props;
  const backgroundColor = useThemeColor(
    {light: lightColor, dark: darkColor},
    'background'
  );
  return <DefaultView style={[{backgroundColor}, style]} {...otherProps} />;
}

export function SafeAreaView(props: ViewProps) {
  const {style, lightColor, darkColor, ...otherProps} = props;
  const backgroundColor = useThemeColor(
    {light: lightColor, dark: darkColor},
    'background'
  );
  return (
    <DefaultSafeAreaView
      style={[{backgroundColor, paddingHorizontal: 20}, style]}
      {...otherProps}
    />
  );
}
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  // Use useThemeColor with empty overrides to pull from colors.ts
  const primaryColor = useThemeColor({}, 'primary');
  const secondaryColor = useThemeColor({}, 'secondary');
  const mutedColor = useThemeColor({}, 'muted');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');

  // Determine colors based on variant and state
  const backgroundColor = (() => {
    if (disabled) return surfaceColor;
    switch (variant) {
      case 'primary':
        return primaryColor;
      case 'secondary':
        return secondaryColor;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return primaryColor;
    }
  })();

  const borderColor = (() => {
    if (variant === 'outline') return primaryColor;
    return 'transparent';
  })();

  // For primary/secondary variants, we use white text.
  // For outline/ghost, we use the primary color.
  const computedTextColor = (() => {
    if (disabled) return mutedColor;
    switch (variant) {
      case 'primary':
      case 'secondary':
        return textColor;
      case 'outline':
      case 'ghost':
        return textColor;
      default:
        return textColor;
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({pressed}) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 12,
          paddingHorizontal: 20,
          backgroundColor:
            pressed && !disabled ? backgroundColor + 'CC' : backgroundColor,
          borderRadius: 8,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={computedTextColor} />
      ) : (
        <Text
          style={[{color: computedTextColor, fontWeight: '600'}, textStyle]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function ThemedTextInput(props: TextInputProps) {
  const {style, lightColor, darkColor, ...otherProps} = props;
  const textColor = useThemeColor({light: lightColor, dark: darkColor}, 'text');
  const inputBackground = useThemeColor(
    {light: lightColor, dark: darkColor},
    'surface'
  );
  const borderColor = useThemeColor(
    {light: lightColor, dark: darkColor},
    'border'
  );

  return (
    <DefaultTextInput
      style={[
        {
          color: textColor,
          backgroundColor: inputBackground,
          padding: 12,
          borderWidth: 1,
          borderColor: borderColor,
          borderRadius: 8,
        },
        style,
      ]}
      placeholderTextColor={useThemeColor(
        {light: '#6B7280', dark: '#A1A1AA'},
        'text'
      )}
      {...otherProps}
    />
  );
}
