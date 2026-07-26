import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Message } from '../types';
import { SERVER_HOST, API_BASE_URL } from '../constants/Config';
import MessageReactions from './MessageReactions';
import { useAuth } from '../context/AuthContext';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  onLongPress?: () => void;
  onPress?: () => void;
  onReact?: (emoji: string) => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
}

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function MessageBubble({
  message,
  isMine,
  onLongPress,
  onPress,
  onReact,
  isSelected,
  isSelectionMode,
}: MessageBubbleProps) {
  const { colors } = useTheme();
  const { token } = useAuth();

  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showReactionsPicker, setShowReactionsPicker] = useState(false);

  if (message.isDeleted) {
    return (
      <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs, isSelected && styles.selectedRow]}>
        <View style={[styles.bubble, { backgroundColor: colors.bubbleReceived, borderBottomLeftRadius: 4 }]}>
          <Text style={[styles.deletedText, { color: colors.textMuted }]}>🚫 This message was deleted</Text>
        </View>
      </View>
    );
  }

  const getImageUri = (imageStr: string) => {
    if (imageStr.startsWith('data:') || imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
      return imageStr;
    }
    return `${SERVER_HOST}${imageStr.startsWith('/') ? '' : '/'}${imageStr}`;
  };

  const handleTranslate = async () => {
    if (!message.message || !token || translating) return;
    setTranslating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: message.message, targetLang: 'si' }),
      });
      const json = await res.json();
      if (json.success && json.data.translatedText) {
        setTranslatedText(json.data.translatedText);
      }
    } catch (e) {
      // Translation error
    } finally {
      setTranslating(false);
    }
  };

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs, isSelected && styles.selectedRow]}>
      <TouchableOpacity
        style={[
          styles.bubble,
          isMine
            ? { backgroundColor: colors.bubbleSent, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.bubbleReceived, borderBottomLeftRadius: 4 },
        ]}
        onLongPress={() => {
          setShowReactionsPicker(!showReactionsPicker);
          if (onLongPress) onLongPress();
        }}
        onPress={() => isSelectionMode && onPress && onPress()}
        activeOpacity={0.9}
        delayLongPress={250}
      >
        {/* Media Image */}
        {!!message.image && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: getImageUri(message.image) }} style={styles.messageImage} />
          </View>
        )}

        {/* Text Message */}
        {!!message.message && (
          <View>
            <Text style={[styles.text, isMine ? { color: colors.bubbleSentText } : { color: colors.bubbleReceivedText }]}>
              {message.message}
            </Text>

            {/* Translation Output */}
            {translatedText && (
              <View style={styles.translationContainer}>
                <Text style={styles.translationText}>{translatedText}</Text>
              </View>
            )}
          </View>
        )}

        {/* Meta Bar */}
        <View style={styles.metaRow}>
          {!!message.message && !translatedText && (
            <TouchableOpacity onPress={handleTranslate} style={styles.translateBtn} disabled={translating}>
              {translating ? (
                <ActivityIndicator size="small" color="#94A3B8" />
              ) : (
                <Ionicons name="language-outline" size={14} color="rgba(255,255,255,0.6)" />
              )}
            </TouchableOpacity>
          )}

          <Text style={[styles.timestamp, isMine ? styles.timestampMine : { color: colors.textMuted }]}>
            {formatTime(message.createdAt)}
          </Text>
          {isMine && (
            <Text style={[styles.readReceipt, message.isRead ? styles.readReceiptRead : styles.readReceiptUnread]}>
              {message.isRead ? '✓✓' : '✓'}
            </Text>
          )}
        </View>

        {/* Emoji Reactions Picker / Display */}
        {(showReactionsPicker || !!message.reactions) && (
          <MessageReactions
            reactions={message.reactions}
            onReact={(emoji) => {
              setShowReactionsPicker(false);
              if (onReact) onReact(emoji);
            }}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
    width: '100%',
  },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  text: { fontSize: 15, lineHeight: 20 },
  deletedText: { fontSize: 14, fontStyle: 'italic' },
  imageContainer: {
    width: 210,
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
  },
  messageImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  selectedRow: { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  translateBtn: { marginRight: 'auto', paddingRight: 8 },
  translationContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  translationText: { fontSize: 13, fontStyle: 'italic', color: '#60A5FA' },
  timestamp: { fontSize: 10 },
  timestampMine: { color: 'rgba(255,255,255,0.75)' },
  readReceipt: { fontSize: 11, marginLeft: 4 },
  readReceiptRead: { color: '#60A5FA' },
  readReceiptUnread: { color: 'rgba(255,255,255,0.5)' },
});
