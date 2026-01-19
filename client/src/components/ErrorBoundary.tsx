// Error Boundary 全域錯誤處理元件
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        // 在生產環境可整合 Sentry 等錯誤追蹤服務
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            // 如果有提供自訂 fallback，使用自訂 fallback
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // 預設錯誤畫面
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                        {/* 錯誤圖示 */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        {/* 標題 */}
                        <h1 className="text-2xl font-bold text-slate-800 mb-3">
                            😵 發生錯誤
                        </h1>

                        {/* 說明文字 */}
                        <p className="text-slate-600 mb-6">
                            很抱歉，應用程式遇到了一些問題。
                            <br />
                            請嘗試重新載入頁面。
                        </p>

                        {/* 錯誤詳情（開發模式顯示） */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                                <p className="text-sm font-mono text-red-700 break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        {/* 操作按鈕 */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button
                                onClick={this.handleReload}
                                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white"
                            >
                                <RefreshCw className="w-4 h-4" />
                                重新載入
                            </Button>
                            <Button
                                onClick={this.handleReset}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                再試一次
                            </Button>
                        </div>

                        {/* 聯繫資訊 */}
                        <p className="mt-6 text-sm text-slate-400">
                            如果問題持續發生，請聯繫管理員
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
