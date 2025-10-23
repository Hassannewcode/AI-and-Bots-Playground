
import React from 'react';

interface UserDetailsPanelProps {
    user: {
        avatar: React.ReactNode;
        status: string;
        name: string;
        rankIcon: React.ReactNode;
        rank: string;
    };
    onDeleteClick: () => void;
}

export const UserDetailsPanel: React.FC<UserDetailsPanelProps> = ({ user, onDeleteClick }) => (
  <div className="flex-grow bg-[#272a33] rounded-lg p-2 flex flex-col border border-[#3a3d46]">
      <h2 className="text-gray-400 mb-2 font-semibold">User Details</h2>
      <div className="bg-[#1e2026] p-2 rounded-md text-center">
          <div className="relative w-20 h-20 mx-auto bg-[#272a33] rounded-md">
              {user.avatar}
              <div className="absolute bottom-0 left-0 right-0 bg-red-600/80 text-white text-xs font-bold py-0.5">{user.status}</div>
          </div>
          <p className="mt-2 font-bold text-white">{user.name}</p>
          <div className="flex items-center justify-center text-gray-400 mt-1">
            {user.rankIcon}
            <span className="ml-1">{user.rank}</span>
          </div>
          <button onClick={onDeleteClick} className="text-xs text-gray-500 hover:text-red-500 mt-1">DELETE</button>
      </div>
  </div>
);
