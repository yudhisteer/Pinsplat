import { useState } from 'react';
import { Html } from '@react-three/drei';




const ChatBox = ({ position, onClose, onSubmit }) => {
    const [message, setMessage] = useState('');
  
    
    const handleSubmit = (e) => {
      e.preventDefault();
      if (message.trim()) {
        onSubmit(message.trim(), position);
        setMessage('');
        onClose();
      }
    };
    
  
    return (
      <Html position={[position.x, position.y + 0.1, position.z]}>
        <div className="relative transform -translate-x-1/2">
          <div className="bg-white/90 backdrop-blur-sm shadow-lg" style={{ width: '280px' }}>
            <form onSubmit={handleSubmit} className="p-2 flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none"
                placeholder="Type a message..."
                autoFocus
              />
              <button
                type="submit"
                className="px-2 py-1.5 text-white bg-black hover:bg-gray-800 rounded"
              >
                Send
              </button>
  
            </form>
          </div>
        </div>
      </Html>
    );
  };
  
  export default ChatBox;