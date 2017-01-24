__author__ = 'sam.royston'
import numpy as np
from scipy.ndimage.interpolation import rotate
from scipy.optimize import leastsq
from transformations import compose_matrix, superimposition_matrix

def align_graph(old_graph, new_graph):
    """
    Align the graph according to the vertices shared with the template graph
    """
    old_ids = np.array([v["name"] for v in old_graph.vs])
    new_ids = np.array([v["name"] for v in new_graph.vs])

    ids_intersection_mask = np.logical_not(np.in1d(new_ids, old_ids))
    ids_intersection = np.ma.compressed(np.ma.masked_array(new_ids, mask = ids_intersection_mask))
    old_coordinates = np.array([old_graph.vs.find(i)["coordinates"] for i in ids_intersection])
    new_coordinates = np.array([new_graph.vs.find(i)["coordinates"] for i in ids_intersection])

    all_coordinates = np.array([v["coordinates"] for v in new_graph.vs])

    print np.size(old_coordinates)
    print np.size(new_coordinates)

    solution = superimposition_matrix(new_coordinates, old_coordinates)

    aligned_all = np.dot(all_coordinates, solution.T[0:3,0:3]) + solution.T[3,0:3]
    aligned = np.dot(new_coordinates, solution.T[0:3,0:3]) + solution.T[3,0:3]


    def residuals(params, old_pos, new_pos):

        scale, tx, ty, tz, rx, ry, rz = params

        transform = compose_matrix(scale=scale, angles=[rx, ry, rz], translate=[tx, ty, tz])

        output = rotate(new_pos, rx, axes=(2,1))
        output = rotate(output, ry, axes=(2,0))
        output = rotate(output, rz, axes=(1,0))
        modified_positions = (output * scale)
        modified_positions[:,0] += tx
        modified_positions[:,1] += ty
        modified_positions[:,2] += tz

        error =  np.sqrt(np.sum((old_pos - modified_positions) ** 2, axis=1))
        return error

    def error(old_pos , modified_positions):
        return np.sum(np.sum((old_pos - modified_positions) ** 2, axis=1))

    # start_values = [1.0, 0, 0, 0, 0, 0, 0]
    # solution = leastsq(residuals, start_values, args=(np.array(old_coordinates), np.array(new_coordinates)))
    print error(old_coordinates, old_coordinates)
    print error(old_coordinates, new_coordinates)
    print error(old_coordinates, aligned)
    return aligned_all.tolist()

def loss_function(A, B):
    return np.mean(((A - B) ** 2),axis=0)
