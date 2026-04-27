import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "./Layout";
import sessionData from "../data/sessionCard.json";
import { 
    Download, Printer, Save, CheckCircle2, AlertCircle, CodeXml, 
    Zap, Users, Calendar, Clock, Star, Code2, BookOpen, MessageSquare,
    RotateCcw, TrendingUp, Award, Lightbulb, Play, CheckSquare2, ArrowLeft, Send
} from "lucide-react";

const styles = `
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        background: #f8f9fa;
    }

    .session-card {
        background: transparent;
        min-height: 100vh;
        padding: clamp(16px, 3vw, 32px);
        border-radius: 0;
        position: relative;
        overflow-x: hidden;
    }

    .session-card::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #f8f9fa;
        pointer-events: none;
        z-index: 0;
    }

    .session-card > div {
        width: 100%;
        padding: 0;
        position: relative;
        z-index: 1;
        max-width: 1400px;
        margin: 0 auto;
    }

    /* ===== SECTION TOP - HEADER PANEL ===== */
    .Section-Top {
        background: linear-gradient(135deg, #060030ff 0%, #000000ff 100%);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border: 1px solid #e5e7eb;
        position: relative;
        overflow: hidden;
    }
    .card-info {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        position: relative;
        z-index: 1;
        padding: 0;
        margin: 12px 0;
    }

    @media (max-width: 1024px) {
        .card-info {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 640px) {
        .card-info {
            grid-template-columns: 1fr;
        }
    }

    .info-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px;
        background: white;
        border-radius: 8px;
        border: 1px solid rgba(82, 102, 129, 0.3);
        transition: all 0.3s ease;
        cursor: default;
        position: relative;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        min-height: auto;
        justify-content: center;
    }
    
    .label {
        font-weight: 600;
        color: rgba(82, 102, 129, 0.8);
        font-size: clamp(10px, 1.7vw, 13px);
        text-transform: Capitalize;
        letter-spacing: 1.5px;
        opacity: 0.9;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .label svg {
        color: #060030ff;
        flex-shrink: 0;
        opacity: 1;
        filter: drop-shadow(0 2px 4px rgba(82, 102, 129, 0.3));
    }

    .value {
        color: #1E293B;
        font-size: clamp(16px, 2.6vw, 18px);
        font-weight: 600;
        letter-spacing: -0.5px;
        word-break: break-word;
    }

    /* ===== SECTION MIDDLE ===== */
    .Section-Middle {
        margin-bottom: 32px;
    }

    .activity-container {
        display: flex;
        flex-direction: column;
        gap: clamp(12px, 2vw, 18px);
        margin-bottom: clamp(20px, 3vw, 28px);
    }

    .activity-card {
        background: white;
        border-radius: 10px;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        border: 1px solid #e5e7eb;
        transition: all 0.3s ease;
        position: relative;
        overflow: visible;
        cursor: pointer;
    }

    .activity-card.collapsed {
        min-height: 70px;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 16px;
        overflow: hidden;
    }

    .activity-card.expanded {
        min-height: auto;
        overflow: visible;
    }

    .activity-card.collapsed:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border-color: #d1d5db;
        transform: translateY(-2px);
    }

    .activity-card::before {
        display: none;
    }

    .activity-collapsed-content {
        display: contents;
    }

    .activity-collapsed-number {
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    .activity-collapsed-name {
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
        word-break: break-word;
        line-height: 1.4;
    }

    .btn-expand {
        background: linear-gradient(135deg, #ffffffff 0%, #ffffffff 100%);
        color: #1E293B;
        border: none;
        padding: clamp(8px, 1.2vw, 12px) clamp(16px, 2.5vw, 24px);
        font-size: clamp(11px, 1.6vw, 12px);
        border: 1px solid rgba(177, 156, 217, 0.3);
        font-weight: 700;
        letter-spacing: 0.3px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        white-space: nowrap;
        flex-shrink: 0;
    }

    .btn-expand:hover {
        transform: scale(1.05);
        box-shadow: 0 8px 24px rgba(177, 156, 217, 0.4);
    }

    .activity-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: clamp(12px, 2vw, 16px);
        font-size: clamp(11px, 1.8vw, 13px);
        font-weight: 700;
        color: #144e82;
        margin-bottom: clamp(12px, 1.5vw, 16px);
        padding-bottom: clamp(12px, 1.5vw, 16px);
        border-bottom: 1px solid rgba(177, 156, 217, 0.15);
        letter-spacing: -0.3px;
    }



    .activity-field {
        margin-bottom: clamp(8px, 1.2vw, 12px);
    }

    .activity-fields-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: clamp(10px, 1.5vw, 16px);
        margin-bottom: clamp(8px, 1.2vw, 12px);
    }

    .activity-fields-row .activity-field {
        margin-bottom: 0;
    }

    @media (max-width: 768px) {
        .activity-fields-row {
            grid-template-columns: 1fr;
        }
    }

    .activity-field label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        color: #144e82;
        font-size: clamp(10px, 1.3vw, 12px);
        margin-bottom: clamp(6px, 0.8vw, 8px);
        text-transform: none;
        letter-spacing: 0.2px;
        opacity: 0.93;
        position: relative;
        padding-left: 0;
    }

    .activity-field label svg {
        color: #060030ff;
        width: clamp(14px, 2.5vw, 18px);
        height: clamp(14px, 2.5vw, 18px);
        flex-shrink: 0;
        filter: drop-shadow(0 2px 6px rgba(177, 156, 217, 0.2));
    }

    .activity-field .text-content {
        color: #000000ff;
        font-size: clamp(11px, 1.4vw, 13px);
        line-height: 1.6;
        padding: clamp(6px, 1vw, 10px) 0;
        background: transparent;
        border: none;
        border-radius: 0;
        word-wrap: break-word;
        transition: none;
        box-shadow: none;
        font-weight: 500;
    }

    .activity-field .text-content:hover {
        background: transparent;
        border: none;
        box-shadow: none;
    }

    /* ===== FEEDBACK TEXTAREA ===== */
    .activity-field textarea {
        width: 100%;
        padding: clamp(8px, 1.2vw, 12px);
        border: 1px solid rgba(177, 156, 217, 0.25);
        margin-top: clamp(6px, 0.8vw, 8px);
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.06) 0%, rgba(255, 193, 7, 0.03) 100%);
        border-left: 2px solid #ffc107;
        border-radius: 8px;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 193, 7, 0.08);
        font-size: clamp(10px, 1.3vw, 12px);
        font-family: inherit;
        resize: vertical;
        min-height: 70px;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        color: #000000ff;
        line-height: 1.5;
        backdrop-filter: blur(10px);
    }

    .activity-field textarea::placeholder {
        color: rgba(177, 156, 217, 0.5);
    }

    .activity-field textarea:hover {
        border-color: rgba(177, 156, 217, 0.5);
        box-shadow: 0 12px 32px rgba(177, 156, 217, 0.2), inset 0 1px 0 rgba(177, 156, 217, 0.15);
    }

    .activity-field textarea:focus {
        outline: none;
        border-color: rgba(177, 156, 217, 0.6);
        box-shadow: 0 0 0 4px rgba(177, 156, 217, 0.15), 0 12px 32px rgba(177, 156, 217, 0.2);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(177, 156, 217, 0.06) 100%);
    }

    /* ===== RADIO GROUPS ===== */
    .activity-radio-group {
        display: flex;
        gap: clamp(16px, 3vw, 28px);
        margin-top: clamp(12px, 2vw, 16px);
        flex-wrap: wrap;
    }

    .activity-radio-group label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        font-size: clamp(11px, 1.4vw, 13px);
        color: #000;
        cursor: pointer;
        padding: 0;
        border-radius: 0;
        transition: all 0.3s ease;
        background: transparent;
        border: none;
        position: relative;
        overflow: visible;
    }

    .activity-radio-group label:hover {
        color: #060030ff;
        transform: none;
        box-shadow: none;
    }

        accent-color: #060030ff;

    /* ===== RATING STARS ===== */
    .rating-container,
    .session-rating-container {
        display: flex;
        gap: clamp(8px, 1.5vw, 12px);
        margin-top: clamp(12px, 2vw, 16px);
        flex-wrap: wrap;
    }

    .rating-star,
    .session-rating-star {
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        color: rgba(177, 156, 217, 0.4);
        font-size: clamp(16px, 2vw, 20px);
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
    }

    .rating-star:hover,
    .session-rating-star:hover {
        transform: scale(1.25) rotate(40deg);
        filter: drop-shadow(0 4px 16px rgba(251, 191, 36, 0.4));
    }

    .rating-star.filled {
        color: #252c35;
        filter: drop-shadow(0 4px 16px rgba(251, 191, 36, 0.4));
    }

    .session-rating-star {
        font-size: clamp(30px, 8vw, 36px);
    }

    .session-rating-star.filled {
        color: #ffc107;
        text-shadow: 0 6px 20px rgba(255, 193, 7, 0.6);
        filter: drop-shadow(0 6px 16px rgba(255, 193, 7, 0.5));
    }

    /* ===== REPEAT EXPLANATION ===== */
    .repeat-explanation {
        display: none;
        margin-top: clamp(12px, 2vw, 16px);
        border-radius: 14px;
    }

    .repeat-explanation.show {
        display: block;
    }

    .repeat-explanation textarea {
        width: 100%;
        padding: clamp(8px, 1.2vw, 12px);
        border: 1px solid rgba(177, 156, 217, 0.25);
        margin-top: clamp(6px, 0.8vw, 8px);
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.06) 0%, rgba(255, 193, 7, 0.03) 100%);
        border-left: 2px solid #ffc107;
        border-radius: 8px;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 193, 7, 0.08);
        font-size: clamp(10px, 1.3vw, 12px);
        font-family: inherit;
        resize: vertical;
        min-height: 70px;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        color: #000000ff;
        line-height: 1.5;
        backdrop-filter: blur(10px);
    }

    .repeat-explanation textarea:focus {
        border-color: rgba(177, 156, 217, 0.5);
        box-shadow: 0 0 0 4px rgba(177, 156, 217, 0.15);
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-12px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /* ===== PYTHON CODE SECTION ===== */
    .python-code-section {
        margin-top: 12px;
        border-radius: 12px;
        padding: clamp(12px, 2.5vw, 20px);
        overflow: hidden;
        position: relative;
    }

    .code-header {
        display: flex;
        align-items: center;
        gap: 12px;
        background: linear-gradient(135deg, #144e82 0%, #060030ff 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 800;
        font-size: clamp(13px, 2.2vw, 16px);
        margin-bottom: 18px;
        padding-bottom: 14px;
        border-bottom: 2px solid rgba(78, 201, 176, 0.4);
        text-transform: uppercase;
        letter-spacing: 0.8px;
    }

    .code-icon {
        font-size: 22px;
        animation: bounce 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
    }

    .code-block {
        font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: clamp(12px, 1.9vw, 14px);
        line-height: 1.8;
        color: #ffbb00ff;
        background: #111;
        padding: clamp(16px, 2.5vw, 20px) !important;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(78, 201, 176, 0.1);
        border: 1px solid rgba(78, 201, 176, 0.25);
        white-space: pre;
        overflow-x: auto;
        padding: 12px 0;
        margin: 0;
    }

    .code-block::-webkit-scrollbar {
        height: 10px;
    }

    .code-block::-webkit-scrollbar-track {
        background: #2d2d30;
        border-radius: 5px;
    }

    .code-block::-webkit-scrollbar-thumb {
        background: #4e4e52;
        border-radius: 5px;
    }

    .code-block::-webkit-scrollbar-thumb:hover {
        background: #6e6e72;
    }

    .code-block-wrapper {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    .copy-code-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        padding: 8px 12px;
        background: transparent;
        color: #858585ff;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 4px;
        z-index: 10;
    }

    .copy-code-btn:hover {
        transform: translateY(-2px);
    }

    .copy-code-btn:active {
        transform: translateY(0);
        box-shadow: 0 2px 6px rgba(37, 44, 53, 0.3);
    }

    .program-item {
        margin-bottom: 20px;
        border: 1px solid #e5e7eb;
        padding: 20px;
        border-radius: 10px;
        transition: all 0.3s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        position: relative;
        overflow: hidden;
        background: white;
    }

    .program-item:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        border-color: #d1d5db;
    }

    .program-header {
        font-size: 14px;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        letter-spacing: 0;
    }

    .program-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #060030ff 0%, #000000ff 100%);
        color: white;
        border-radius: 50%;
        font-size: 12px;
        font-weight: 700;
        flex-shrink: 0;
    }

    .story-section {
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.08), rgba(255, 152, 0, 0.08));
        border: 1px solid rgba(255, 193, 7, 0.2);
    }

    .story-label {
        font-size: 12px;
        font-weight: 700;
        color: #F59E0B;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .code-label {
        font-size: 12px;
        font-weight: 700;
        color: #252c35;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 10px;
        margin-top: 14px;
        margin-left: 15px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .story-text {
        color: #6b7280;
        font-size: 13px;
        line-height: 1.6;
        font-style: italic;
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    /* ===== SECTION BOTTOM ===== */
    .Section-Bottom {
        background: white;
        border-radius: 12px;
        padding: 32px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border: 1px solid #e5e7eb;
        position: relative;
        overflow: hidden;
        margin-top: 32px;
    }

    .Section-Bottom::before {
        display: none;
    }

    .bottom-section-field {
        margin-bottom: clamp(10px, 1.5vw, 16px);
    }

    .bottom-section-field:last-child {
        margin-bottom: 0;
    }

    .bottom-section-field label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: #1f2937;
        font-size: 14px;
        margin-bottom: 8px;
        text-transform: none;
        letter-spacing: 0;
        opacity: 1;
        position: relative;
        padding-left: 0;
    }

    .bottom-section-field label svg {
        color: #252c35;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        filter: none;
    }

    .completion-status {
        display: flex;
        flex-wrap: wrap;
        gap: clamp(12px, 2.5vw, 20px);
        margin-top: clamp(12px, 2vw, 16px);
    }

    .completion-status label {
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 700;
        font-size: clamp(14px, 2vw, 16px);
        color: #d0d0d0;
        cursor: pointer;
        padding: clamp(12px, 2vw, 16px) clamp(20px, 3vw, 28px);
        border-radius: 14px;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(177, 156, 217, 0.04) 100%);
        border: 1px solid rgba(177, 156, 217, 0.25);
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(177, 156, 217, 0.1);
    }

    .completion-status label::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(177, 156, 217, 0.15), transparent);
        transition: left 0.5s ease;
        pointer-events: none;
    }

    .completion-status label:hover::before {
        left: 100%;
    }

    .completion-status label:hover {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(177, 156, 217, 0.06) 100%);
        border-color: rgba(177, 156, 217, 0.4);
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(177, 156, 217, 0.2), inset 0 1px 0 rgba(177, 156, 217, 0.15);
    }

    .completion-status input[type="radio"] {
        cursor: pointer;
        width: 20px;
        height: 20px;
        accent-color: #060030ff;
        flex-shrink: 0;
    }

    .feedback-textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        min-height: 100px;
        transition: all 0.3s ease;
        background: white;
        color: #1f2937;
        line-height: 1.5;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .feedback-textarea::placeholder {
        color: #9ca3af;
    }

    .feedback-textarea:hover {
        border-color: #d1d5db;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .feedback-textarea:focus {
        outline: none;
        border-color: #252c35;
        box-shadow: 0 0 0 3px rgba(37, 44, 53, 0.1);
        background: white;
    }

    .tech-content {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(177, 156, 217, 0.05) 100%);
        padding: clamp(20px, 3vw, 28px);
        border-radius: 14px;
        border: 1px solid rgba(177, 156, 217, 0.25);
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(177, 156, 217, 0.1);
        position: relative;
        overflow: hidden;
    }

    .tech-content:hover {
        box-shadow: 0 16px 48px rgba(177, 156, 217, 0.25), inset 0 1px 0 rgba(177, 156, 217, 0.15);
        border-color: rgba(177, 156, 217, 0.4);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(177, 156, 217, 0.08) 100%);
    }

    .tech-description {
        color: #0000000ff;
        font-size: clamp(14px, 2vw, 16px);
        line-height: 1.9;
        margin-bottom: clamp(16px, 2.5vw, 20px);
        word-wrap: break-word;
        position: relative;
        z-index: 1;
    }

    .tech-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: #144e82;
        text-decoration: none;
        font-size: clamp(11px, 2vw, 11px);
        border: 1px solid rgba(20, 78, 130, 0.4);
        font-weight: 800;
        padding: clamp(12px, 2vw, 16px) clamp(24px, 4vw, 36px);
        background: transparent;
        border-radius: 12px;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        text-transform: uppercase;
        letter-spacing: 0.8px;
        box-shadow: 0 12px 32px rgba(177, 156, 217, 0.4);
        position: relative;
        overflow: hidden;
        z-index: 1;
    }

    

    .tech-link:hover {
        transform: translateY(-2px);
        color: #000;
        box-shadow: 0 16px 48px rgba(177, 156, 217, 0.5);
    }

    .tech-link:hover::before {
        left: 100%;
    }

    /* ===== TECHNOLOGY SECTION ===== */
    .technology-card {
        background: white;
        border-radius: 10px;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        border: 1px solid #e5e7eb;
        transition: all 0.3s ease;
        position: relative;
        overflow: visible;
        cursor: pointer;
        margin-bottom: 20px;
    }

    .technology-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border-color: #d1d5db;
        transform: translateY(-2px);
    }

    .technology-card.collapsed {
        min-height: 70px;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 16px;
        overflow: hidden;
    }

    .technology-card.expanded {
        min-height: auto;
        overflow: visible;
    }

    .technology-card::before {
        display: none;
    }

    .technology-collapsed-content {
        display: contents;
    }

    .technology-collapsed-title {
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
        word-break: break-word;
        line-height: 1.4;
    }

    .technology-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: clamp(12px, 2vw, 16px);
        font-size: clamp(11px, 1.8vw, 13px);
        font-weight: 700;
        color: #144e82;
        margin-bottom: clamp(12px, 1.5vw, 16px);
        padding-bottom: clamp(12px, 1.5vw, 16px);
        border-bottom: 1px solid rgba(177, 156, 217, 0.15);
        letter-spacing: -0.3px;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 1024px) {
        .activity-container {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 768px) {
        .session-card {
            padding: clamp(14px, 3vw, 20px);
        }

        .activity-container {
            grid-template-columns: 1fr;
        }

        .card-info {
            grid-template-columns: 1fr;
            gap: 14px;
        }

        .activity-radio-group,
        .completion-status {
            flex-direction: column;
            gap: 10px;
        }

        .activity-radio-group label,
        .completion-status label {
            width: 100%;
            padding: 12px 16px;
        }

        .rating-container {
            justify-content: flex-start;
        }

        .session-rating-container {
            justify-content: center;
            gap: 8px;
        }

        .Section-Top,
        .Section-Bottom {
            border-radius: 16px;
            padding: 20px;
        }
    }

    @media (max-width: 480px) {
        .session-card {
            padding: 12px;
            background: linear-gradient(135deg, #f9fafb 0%, #f3e8f5 100%);
        }

        .Section-Top,
        .Section-Bottom {
            padding: 18px;
            margin-bottom: 20px;
            border-radius: 14px;
        }

        .activity-card {
            padding: 16px;
        }

        .tech-link {
            display: flex;
            width: 100%;
            justify-content: center;
        }


        .info-item {
            padding: 12px;
        }

        .activity-field label {
            font-size: 12px;
        }
    }

    @media (max-width: 320px) {
        .session-card {
            padding: 8px;
        }

        .Section-Top,
        .Section-Bottom,
        .activity-card {
            padding: 12px;
            border-radius: 12px;
        }

        .activity-header {
            font-size: 16px;
        }
    }

    /* ===== ACTION BUTTONS ===== */
    .action-buttons {
        display: flex;
        gap: clamp(8px, 1.5vw, 16px);
        flex-wrap: wrap;
        margin-bottom: clamp(16px, 2.5vw, 24px);
        align-items: center;
        padding: 0;
        justify-content: center;
    }

    .back-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #000;
        background: transparent;
        border: 1px solid #252c35;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.3s ease;
        padding: 12px 18px;
        border-radius: 5px;
        position: relative;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .back-btn:hover {
        color: white;
        background: #000;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }

    .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: clamp(12px, 2vw, 16px) clamp(24px, 3.5vw, 36px);
        border: none;
        border-radius: 12px;
        font-weight: 700;
        font-size: clamp(13px, 2vw, 15px);
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        text-transform: uppercase;
        letter-spacing: 0.6px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        position: relative;
        white-space: nowrap;
        overflow: hidden;
    }

    .btn:hover {
        transform: translateY(-4px);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
    }

    .btn-secondary {
        background: linear-gradient(135deg, #060030ff 0%, #000000ff 100%);
        color: #fff;
        border: 1px solid rgba(177, 156, 217, 0.3);
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }

    .btn-secondary:hover {
        background: transparent;
        border-color: rgba(177, 156, 217, 0.5);
        color: #000;
        box-shadow: 0 12px 32px rgba(177, 156, 217, 0.25);
    }

    .btn-submit {
        background: linear-gradient(135deg, #000000ff 0%, #144e82 100%);
        color: white;
        padding: 12px 32px;
        font-weight: 700;
        letter-spacing: 0.5px;
        border: 1px solid rgba(16, 83, 185, 0.2);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .btn-submit:hover {
        box-shadow: 0 8px 24px rgba(16, 33, 185, 0.3);
        background: linear-gradient(135deg, #144e82 0%, #000000ff 100%);
        color: white;
        transform: translateY(-2px);
    }

    .btn-collapse {
        background: linear-gradient(135deg, #ffffffff 0%, #ffffffff 100%);
        color: #1E293B;
        border: none;
        padding: clamp(8px, 1.2vw, 12px) clamp(16px, 2.5vw, 24px);
        font-size: clamp(11px, 1.6vw, 12px);
        font-weight: 700;
        letter-spacing: 0.3px;
        border: 1px solid rgba(177, 156, 217, 0.3);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        white-space: nowrap;
        flex-shrink: 0;
    }

    .btn-collapse:hover {
        transform: scale(1.05);
        box-shadow: 0 8px 24px rgba(177, 156, 217, 0.4);
    }

    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .btn:disabled:hover {
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        transform: none;
    }

    /* ===== TOAST NOTIFICATIONS ===== */
    .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .toast {
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        min-width: 300px;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(400px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .toast-success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
    }

    .toast-error {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
    }

    .toast-info {
        background: linear-gradient(135deg, #060030ff 0%, #060030ff 100%);
        color: white;
    }

    /* ===== SESSION SUMMARY ===== */
    .session-summary {
        background: linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(55, 35, 80, 0.5) 100%);
        border-radius: 28px;
        padding: clamp(40px, 6vw, 60px);
        margin-bottom: clamp(40px, 6vw, 60px);
        border: 1px solid rgba(177, 156, 217, 0.2);
        box-shadow: 0 20px 60px rgba(177, 156, 217, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        position: relative;
        overflow: hidden;
    }

    .session-summary::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(177, 156, 217, 0.3), transparent);
    }

    .summary-title {
        font-size: clamp(20px, 4vw, 28px);
        font-weight: 800;
        color: #f0f0f0;
        margin-bottom: clamp(24px, 4vw, 36px);
        display: flex;
        align-items: center;
        gap: 16px;
        letter-spacing: -0.5px;
    }

    .summary-title svg {
        color: #060030ff;
        width: clamp(24px, 5vw, 32px);
        height: clamp(24px, 5vw, 32px);
        filter: drop-shadow(0 4px 12px rgba(177, 156, 217, 0.3));
    }

    .summary-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
        margin-bottom: 24px;
        max-width: 280px;
        margin-left: auto;
        margin-right: auto;
    }

    @media (max-width: 1024px) {
        .summary-grid {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 640px) {
        .summary-grid {
            grid-template-columns: 1fr;
        }
    }

    .summary-item {
        background: white;
        text-align: center;
        border-radius: 10px;
        border: 1px solid #e5e7eb;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    

    .summary-item.info-item-primary {
        background: transparent;
        border: none;
    }

    .summary-item.info-item-primary .summary-label {
        color: #fff;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        letter-spacing: 0.5px;
        font-weight: 600;
    }

    .summary-item.info-item-primary .summary-value {
        color: #ffffffff;
        font-size: 32px;
        font-weight: 800;
        letter-spacing: -1px;
    }



    .progress-section {
        margin-top: 12px;
        padding: 12px;
        background: #252c35;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: all 0.3s ease;
    }

    .progress-section:hover {
        border-color: #d1d5db;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .progress-label {
        font-size: 12px;
        font-weight: 700;
        color: #ffffffff;
        letter-spacing: 0;
    }

    .progress-percentage {
        font-size: 16px;
        font-weight: 700;
        color: #ffffffff;
        letter-spacing: 0.5px;
    }

    .progress-bar {
        width: 100%;
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;
        display: block;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #dde3e8, #060030ff);
        transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        border-radius: 6px;
        box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
    }

    .progress-summary {
        margin-top: 4px;
    }

    .summary-text {
        font-size: 12px;
        color: #ffffffff;
        line-height: 1.5;
    }

    .summary-text strong {
        color: #ffffffff;
        font-weight: 700;
    }

    /* ===== PRINT STYLES ===== */
    @media print {
        .session-card {
            background: white;
            min-height: auto;
        }

        .action-buttons {
            display: none;
        }

        .activity-card {
            page-break-inside: avoid;
            box-shadow: none;
        }

        .Section-Top,
        .Section-Bottom,
        .session-summary {
            page-break-inside: avoid;
        }

        .btn {
            display: none;
        }

        body {
            background: white;
        }
    }

    /* ===== DARK MODE SUPPORT ===== */
    @media (prefers-color-scheme: dark) {
        .session-card {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        }

        .Section-Top,
        .Section-Bottom,
        .activity-card,
        .session-summary {
            background: #0f3460;
            border-color: rgba(255, 255, 255, 0.1);
        }

        .label,
        .activity-field label,
        .bottom-section-field label,
        .summary-label {
            color: #e0e0e0;
        }

        .value,
        .activity-field .text-content,
        .feedback-textarea,
        .summary-value {
            color: #e0e0e0;
            background: rgba(255, 255, 255, 0.05);
        }

        .action-buttons {
            background: rgba(15, 52, 96, 0.95);
            border-color: rgba(255, 255, 255, 0.1);
        }
    }

    @media (max-width: 768px) {
        .back-btn {
            width: 100%;
            justify-content: center;
            margin-bottom: 12px;
        }

        .action-buttons {
            position: static;
            flex-direction: column-reverse;
            gap: 12px;
        }

        .btn {
            width: 100%;
            padding: 12px 20px;
        }

        .toast-container {
            left: 20px;
            right: 20px;
        }

        .toast {
            min-width: auto;
        }
    }
`;

// Toast Notification Component
function Toast({ message, type, onClose }) {
    React.useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`toast toast-${type}`}>
            {type === 'success' && <CheckCircle2 size={20} />}
            {type === 'error' && <AlertCircle size={20} />}
            {message}
        </div>
    );
}

// SessionCard component
export function SessionCard() {
    const navigate = useNavigate();
    const [session, setSession] = useState(sessionData);
    const [toasts, setToasts] = useState([]);
    const [expandedActivity, setExpandedActivity] = useState(null);
    const [expandedTechnology, setExpandedTechnology] = useState(false);
    const contentRef = useRef(null);
    const toastIdRef = useRef(0);

    const addToast = (message, type = 'info') => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        return () => {
            setToasts(prev => prev.filter(t => t.id !== id));
        };
    };

    const handleActivityChange = (activityIndex, field, value) => {
        setSession(prev => {
            const newSession = { ...prev };
            newSession.activities[activityIndex] = {
                ...newSession.activities[activityIndex],
                [field]: value
            };
            return newSession;
        });
    };

    const handleSessionChange = (field, value) => {
        setSession(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveSession = () => {
        const dataStr = JSON.stringify(session, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `session-${session.sessionNo}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast('Session saved successfully!', 'success');
    };

    const calculateCompletionRate = () => {
        const completed = session.activities.filter(a => a.completedOnTime === 'yes').length;
        return Math.round((completed / session.activities.length) * 100);
    };

    const calculateAverageRating = () => {
        const sum = session.activities.reduce((acc, a) => acc + (a.rating || 0), 0);
        return (sum / session.activities.length).toFixed(1);
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code).then(() => {
            addToast('Code copied to clipboard!', 'success');
        }).catch(() => {
            addToast('Failed to copy code', 'error');
        });
    };

    const completionRate = calculateCompletionRate();
    const avgRating = calculateAverageRating();
    
    return (
        <Layout>
            <>
                <style>{styles}</style>
                
                {/* Toast Notifications */}
                <div className="toast-container">
                    {toasts.map(toast => (
                        <Toast 
                            key={toast.id}
                            message={toast.message}
                            type={toast.type}
                            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                        />
                    ))}
                </div>

                {/* Action Buttons */}
                <button 
                    className="back-btn"
                    onClick={() => navigate(-1)}
                    title="Go back to previous page"
                >
                    <ArrowLeft size={18} />
                    Back
                </button>

                <div className="session-card" ref={contentRef}>
                <div>
                    {/* Combined Session Header */}
                    <div className="Section-Top">
                        {/* Overview Stats - Row 1 */}
                        <div className="summary-grid">
                            <div className="summary-item info-item-primary">
                                <div className="summary-label">Session Number</div>
                                <div className="summary-value">{session?.sessionNo || 'N/A'}</div>
                            </div>
                        </div>

                        {/* Session Details - Row 2 */}
                        <div className="card-info">
                            <div className="info-item">
                                <span className="label"><Users size={12} />Player</span>
                                <span className="value">{session?.playerName || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <span className="label"><Award size={12} />Coach:</span>
                                <span className="value">{session?.coachName || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <span className="label"><Calendar size={12} />Date:</span>
                                <span className="value">{session?.date || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <span className="label"><Clock size={12} />Hours:</span>
                                <span className="value">{session?.hours || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Progress Section - Row 3 */}
                        <div className="progress-section">
                            <div className="progress-header">
                                <div className="progress-label">Session Progress</div>
                                <div className="progress-percentage">{completionRate}%</div>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${completionRate}%` }}></div>
                            </div>
                            <div className="progress-summary">
                                <span className="summary-text"><strong>{session.activities.filter(a => a.completedOnTime === 'yes').length}</strong> of <strong>{session.activities.length}</strong> activities completed • Average rating: <strong>{avgRating}/5</strong></span>
                            </div>
                        </div>
                    </div>

                    {/* Section Middle - Activities */}
                    <div className="Section-Middle">
                        <div className="activity-container">
                            {session.activities.map((activity, activityNum) => (
                                <div 
                                    key={activityNum} 
                                    className={`activity-card ${expandedActivity === activityNum ? 'expanded' : 'collapsed'}`}
                                >
                                    {expandedActivity === activityNum ? (
                                        // EXPANDED VIEW
                                        <>
                                            <div className="activity-header">
                                                <span>Activity {activityNum + 1}</span>
                                                <button 
                                                    className="btn-collapse"
                                                    onClick={() => setExpandedActivity(null)}
                                                    title="Collapse this activity"
                                                >
                                                    Collapse
                                                </button>
                                            </div>
                                            
                                            <div className="activity-field">
                                                <label><BookOpen size={14} />Activity Name:</label>
                                                <div className="text-content">
                                                    {activity?.name || 'N/A'}
                                                </div>
                                            </div>

                                            <div className="activity-field">
                                                <label><Lightbulb size={14} />Description:</label>
                                                <div className="text-content">
                                                    {activity?.description || 'N/A'}
                                                </div>
                                            </div>

                                            <div className="activity-field">
                                                <label><MessageSquare size={14} />Instructions to Coach:</label>
                                                <div className="text-content">
                                                    {activity?.instructionsToCoach || 'N/A'}
                                                </div>
                                            </div>

                                            {/* Python Code Section */}
                                            {activity?.type === 'python' && activity?.pythonCode && (
                                                <div className="activity-field">
                                                    <div className="python-code-section">
                                                        <div className="code-header">
                                                            <Code2 size={18} />
                                                            <span>Python Programs for Coach Reference</span>
                                                        </div>
                                                        {Object.entries(activity.pythonCode).map(([programKey, programData], index) => (
                                                            <div key={programKey} className="program-item">
                                                                <div className="program-header">
                                                                    <div className="program-badge">{index + 1}</div>
                                                                    <Code2 size={16} />
                                                                    <span>{programKey.replace('Program', 'Program ')}</span>
                                                                </div>
                                                                
                                                                {programData.story && (
                                                                    <div className="story-section">
                                                                        <div className="story-label">
                                                                            <BookOpen size={14} />
                                                                            <span>Story</span>
                                                                        </div>
                                                                        <div className="story-text">{programData.story}</div>
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="code-label">
                                                                    <Code2 size={14} />
                                                                    <span>Code</span>
                                                                </div>
                                                                <div className="code-block-wrapper">
                                                                    <button 
                                                                        className="copy-code-btn"
                                                                        onClick={() => handleCopyCode(programData.code)}
                                                                        title="Copy code to clipboard"
                                                                    >
                                                                        <span>Copy</span>
                                                                    </button>
                                                                    <pre className="code-block">{programData.code}</pre>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="activity-field">
                                                <label><MessageSquare size={14} />Feedback Area:</label>
                                                <textarea 
                                                    placeholder="Enter feedback for this activity..."
                                                    value={activity?.feedback || ''}
                                                    onChange={(e) => handleActivityChange(activityNum, 'feedback', e.target.value)}
                                                />
                                            </div>

                                            <div className="activity-fields-row">
                                                <div className="activity-field">
                                                    <label><CheckSquare2 size={14} />Activity Completed on Time:</label>
                                                    <div className="activity-radio-group">
                                                        <label>
                                                            <input 
                                                                type="radio" 
                                                                name={`completed-${activityNum}`}
                                                                value="yes"
                                                                checked={activity?.completedOnTime === 'yes'}
                                                                onChange={(e) => handleActivityChange(activityNum, 'completedOnTime', e.target.value)}
                                                            />
                                                            Yes
                                                        </label>
                                                        <label>
                                                            <input 
                                                                type="radio" 
                                                                name={`completed-${activityNum}`}
                                                                value="no"
                                                                checked={activity?.completedOnTime === 'no'}
                                                                onChange={(e) => handleActivityChange(activityNum, 'completedOnTime', e.target.value)}
                                                            />
                                                            No
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="activity-field">
                                                    <label><RotateCcw size={14} />Repeat the Activity:</label>
                                                    <div className="activity-radio-group">
                                                        <label>
                                                            <input 
                                                                type="radio" 
                                                                name={`repeat-${activityNum}`}
                                                                value="yes"
                                                                checked={activity?.repeat === 'yes'}
                                                                onChange={(e) => handleActivityChange(activityNum, 'repeat', e.target.value)}
                                                            />
                                                            Yes
                                                        </label>
                                                        <label>
                                                            <input 
                                                                type="radio" 
                                                                name={`repeat-${activityNum}`}
                                                                value="no"
                                                                checked={activity?.repeat === 'no'}
                                                                onChange={(e) => handleActivityChange(activityNum, 'repeat', e.target.value)}
                                                            />
                                                            No
                                                        </label>
                                                    </div>
                                                    <div className={`repeat-explanation ${activity?.repeat === 'yes' ? 'show' : ''}`}>
                                                        <textarea 
                                                            placeholder="Explain why this activity should be repeated..."
                                                            value={activity?.repeatReason || ''}
                                                            onChange={(e) => handleActivityChange(activityNum, 'repeatReason', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="activity-field">
                                                <label><Star size={14} />Rating:</label>
                                                <div className="rating-container">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <span 
                                                            key={star} 
                                                            className={`rating-star ${star <= (activity?.rating || 0) ? 'filled' : ''}`}
                                                            onClick={() => handleActivityChange(activityNum, 'rating', star)}
                                                            role="button"
                                                            tabIndex="0"
                                                            aria-label={`Rate ${star} out of 5`}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    handleActivityChange(activityNum, 'rating', star);
                                                                }
                                                            }}
                                                        >
                                                            ★
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        // COLLAPSED VIEW
                                        <>
                                            <div className="activity-collapsed-number">Activity {activityNum + 1}</div>
                                            <div className="activity-collapsed-name">{activity?.name || 'N/A'}</div>
                                            <button 
                                                className="btn-expand"
                                                onClick={() => setExpandedActivity(activityNum)}
                                                title="Expand this activity"
                                            >
                                                Expand
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                            {/* New Technology Section - As Activity 6 */}
                            <div className={`technology-card ${expandedTechnology ? 'expanded' : 'collapsed'}`}>
                                {expandedTechnology ? (
                                    // EXPANDED VIEW
                                    <>
                                        <div className="technology-header">
                                            <span>Activity 6</span>
                                            <button 
                                                className="btn btn-collapse"
                                                onClick={() => setExpandedTechnology(false)}
                                                title="Collapse this activity"
                                            >
                                                Collapse
                                            </button>
                                        </div>
                                        <div className="tech-content">
                                            <div className="tech-description">
                                                {session?.newTechnology?.description || 'No new technology mentioned for this session'}
                                            </div>
                                            {session?.newTechnology?.referenceLink && (
                                                <a 
                                                    href={session.newTechnology.referenceLink} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="tech-link"
                                                >
                                                    <Download size={14} />
                                                    Reference Link
                                                </a>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    // COLLAPSED VIEW
                                    <>
                                        <div className="activity-collapsed-number">Activity 6</div>
                                        <div className="technology-collapsed-title">New Technology for player</div>
                                        <button 
                                            className="btn-expand"
                                            onClick={() => setExpandedTechnology(true)}
                                            title="Expand this activity"
                                        >
                                            Expand
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Section Bottom - Only Feedback & Rating */}
                    <div className="Section-Bottom">
                        <div className="bottom-section-field">
                            <label><MessageSquare size={16} />Overall Feedback for the Session and Any Suggestions from the Player for Next Session:</label>
                            <textarea 
                                className="feedback-textarea"
                                placeholder="Enter overall feedback for the session and any suggestions for next session."
                                value={session?.overallFeedback || ''}
                                onChange={(e) => handleSessionChange('overallFeedback', e.target.value)}
                            />
                        </div>

                        <div className="bottom-section-field">
                            <label><TrendingUp size={16} />Overall Session Rating:</label>
                            <div className="session-rating-container">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <span 
                                        key={star} 
                                        className={`session-rating-star ${star <= (session?.sessionRating || 0) ? 'filled' : ''}`}
                                        onClick={() => handleSessionChange('sessionRating', star)}
                                        role="button"
                                        tabIndex="0"
                                        aria-label={`Rate session ${star} out of 5`}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                handleSessionChange('sessionRating', star);
                                            }
                                        }}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

                <div className="action-buttons">
                    <button 
                        className="btn btn-submit"
                        onClick={handleSaveSession}
                        title="Save your progress as draft"
                    >
                        <Save size={18} />
                        Save Draft
                    </button>
                    <button 
                        className="btn btn-submit"
                        onClick={handleSaveSession}
                        title="Submit session for review"
                    >
                        <Send size={18} />
                        Submit Session
                    </button>
                </div>
            </>
        </Layout>
    );
}

export default SessionCard;

