import { useState } from 'react';

export const useFacturaDetalleGeneralState = () => {
  const [factura, setFactura] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentUser, setCommentUser] = useState('admin');
  const [commentText, setCommentText] = useState('');
  const [estadoNuevo, setEstadoNuevo] = useState('');
  const [estadoUser, setEstadoUser] = useState('admin');
  const [estadoMotivo, setEstadoMotivo] = useState('');
  const [error, setError] = useState('');
  const [mhLoading, setMhLoading] = useState(false);
  const [mhError, setMhError] = useState('');

  return {
    factura,
    setFactura,
    comentarios,
    setComentarios,
    estados,
    setEstados,
    loading,
    setLoading,
    commentUser,
    setCommentUser,
    commentText,
    setCommentText,
    estadoNuevo,
    setEstadoNuevo,
    estadoUser,
    setEstadoUser,
    estadoMotivo,
    setEstadoMotivo,
    error,
    setError,
    mhLoading,
    setMhLoading,
    mhError,
    setMhError
  };
};
